// Import the neccesary modules.
import asyncq from "async-q";
import req from "request";
import Movie from "../../models/Movie";
import { maxWebRequest, webRequestTimeout } from "../../config/constants";
import Helper from "../helpers/moviehelper";
import Util from "../../util";

/** Class for scraping movies from https://yts.ag/. */
export default class YTS {

  /**
   * Create a yts object for movie content.
   * @param {String} name - The name of the content provider.
   */
  constructor(name) {
    /**
     * The name of the torrent provider.
     * @type {String}
     */
    this.name = name;

    /**
     * The request object with added defaults.
     * @type {Object}
     */
    this._request = req.defaults({
      "headers": {
        "Content-Type": "application/json"
      },
      "baseUrl": "https://yts.ag/api/v2/list_movies.json",
      "timeout": webRequestTimeout * 1000
    });

    /**
     * The helper object for adding movies.
     * @type {Helper}
     */
    this._helper = new Helper(this.name);

    /**
     * The util object with general functions.
     * @type {Util}
     */
    this._util = new Util();

    this.last_page = 0;
  }

  /**
   * Get the total pages to go through.
   * @param {Boolean} [retry=true] - Retry the request.
   * @returns {Promise} - The maximum pages to go through.
   */
  _getTotalPages(retry = true) {
    const url = "list_movies.json";
    return new Promise((resolve, reject) => {
      this._request(url, (err, res, body) => {
        if (err && retry) {
          return resolve(this._getTotalPages(false));
        } else if (err) {
          logger.warn(`YTS: ${err} with link: 'list_movies.json'`);
          return reject(`YTS: ${err} with link: 'list_movies.json'`);
        } else if (!body || res.statusCode >= 400) {
          logger.warn(`YTS: Could not find data on '${url}', status code: ${res.statusCode}.`);
          return reject(`YTS: Could not find data on '${url}'.`);
        } else {
          body = JSON.parse(body);
          const totalPages = Math.ceil(body.data.movie_count / 50);
          return resolve(totalPages);
        }
      });
    });
  }

  /**
   * Format data from movies.
   * @param {Object} data - Data about the movies.
   * @returns {Object} - An object with the imdb id and the torrents.
   */
  _formatPage(data) {
    return asyncq.each(data, movie => {
      if (movie && movie.torrents && movie.imdb_code && movie.language.match(/english/i)) {
        const torrents = {};
        torrents["en"] = {};
        movie.torrents.forEach(torrent => {
          if (torrent.quality !== "3D") {
            torrents["en"][torrent.quality] = {
              url: `magnet:?xt=urn:btih:${torrent.hash}&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://p4p.arenabg.ch:1337&tr=udp://tracker.internetwarriors.net:1337`,
              seed: torrent.seeds,
              peer: torrent.peers,
              size: torrent.size_bytes,
              filesize: torrent.size,
              provider: "YTS"
            };
          }
        });

        return {
          imdb_id: movie.imdb_code,
          torrents
        };
      }
    });
  }

  /**
   * Delay the cb.
   * @param {Integer} page - The page to get the data from.
   * @param {Boolean} [retry=true] - Retry the function.
   * @returns {Promise} - Formatted data from one page.
   */
  _delay (resolve, data) {
    setTimeout(() => {
      return resolve(data)
    }, 1500);
  }
  /**
   * Get formatted data from one page.
   * @param {Integer} page - The page to get the data from.
   * @param {Boolean} [retry=true] - Retry the function.
   * @returns {Promise} - Formatted data from one page.
   */
  _getOnePage(page, retry = true) {
    const url = `?limit=50&page=${page + 1}&sort_by=date_added&order_by=asc`;
    return new Promise((resolve, reject) => {
      this._request(url, (err, res, body) => {
        if (err && retry) {
          return resolve(this._getOnePage(page, false));
        } else if (err) {
          logger.error(`YTS: ${err} with link: '?limit=50&page=${page + 1}'`);
          return this._delay(resolve, []);
        } else if (!body || res.statusCode >= 400) {
          logger.error(`YTS: Could not find data on '${url}'.`);
          return this._delay(resolve, []);
        } else {
          try {
            body = JSON.parse(body);
            if (body.data.movies) {
              return this._delay(resolve, this._formatPage(body.data.movies));
            } else {
              return this._delay(resolve, []);
            }
          } catch (e) {
            logger.warn(`Parse json from yts failed: ${e.message} - ${body}`)
            return this._delay(resolve, []);
          }
        }
      });
    });
  }

  /**
   * All the found movies.
   * @returns {Array} - A list of all the found movies.
   */
  async _getMovies() {
    let movies = [];
    try {
      let totalPages = await this._getTotalPages(); // Change to 'const' for production.
      if (!totalPages) {
        logger.warn(`${this.name}: totalPages returned; '${totalPages}'`);
        return movies;
      }

      // totalPages = 3; // For testing purposes only.
      return await asyncq.timesSeries(totalPages, async page => {
        if (page + 1 > this.last_page) {
          try {
            logger.info(`${this.name}: Starting searching YTS on page ${page + 1} out of total ${totalPages} pages`);
            const onePage = await this._getOnePage(page);
            movies = movies.concat(onePage);
            logger.info(`${this.name}: Got ${onePage.length} YTS movies on page ${page + 1} out of ${totalPages}`);
            this.last_page = page + 1;
          } catch (err) {
            logger.warn(`Get yts movies page failed: ${err.message}`);
          }
        }
      }).then(() => movies);
    } catch (err) {
      logger.warn(`Get yts movies page has failed: ${err.message}`);
      return movies;
    }
  }

  /**
   * Returns a list of all the inserted torrents.
   * @returns {Movie[]} - A list of scraped movies.
   */
  async search() {
    try {
      logger.info(`${this.name}: Starting scraping...`);
      const movies = await this._getMovies();
      return await asyncq.eachLimit(movies, maxWebRequest, async ytsMovie => {
        if (ytsMovie && ytsMovie.imdb_id) {
          const newMovie = await this._helper.getTraktInfo(ytsMovie.imdb_id);
          if (newMovie && newMovie._id) {
            delete ytsMovie.imdb_id;
            return await this._helper.addTorrents(newMovie, ytsMovie.torrents);
          }
        }
      });
    } catch (err) {
      return this._util.onError(err);
    }
  }

}
