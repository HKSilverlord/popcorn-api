// Import the neccesary modules.
import asyncq from "async-q";
import req from "request";
import async from "async";
import Movie from "../models/Movie";
import Show from "../models/Show";
import { maxWebRequest, webRequestTimeout } from "../config/constants";
import MovieHelper from "./helpers/moviehelper";
import ShowHelper from "./helpers/showhelper";
import Util from "../util";
import { trakt } from "../config/constants";

/** Class for scraping movies from https://yts.ag/. */
export default class Trakt {

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
     * The helper object for adding movies.
     * @type {Helper}
     */
    this._mHelper = new MovieHelper(this.name);

    /**
     * The helper object for adding shows.
     * @type {Helper}
     */
    this._sHelper = new ShowHelper(this.name);

    /**
     * The util object with general functions.
     * @type {Util}
     */
    this._util = new Util();

    this.last_page = 0;
  }

  _delay () {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        return resolve();
      }, 500)
    })
  }

  /**
   * Save new movie to database.
   * @param {Object} detail - Movie detail.
   * @param {Boolean} [retry=true] - Retry the function.
   * @returns {Promise} - Formatted data from one page.
   */

  async _newMovie (detail) {
    try {
      return await new Movie({
        _id: detail.ids.imdb || 'tmdb-' + detail.ids.tmdb || 'trakt-' + detail.ids.trakt.toString(),
        imdb_id: detail.ids.imdb || 'tmdb-' + detail.ids.tmdb || 'trakt-' + detail.ids.trakt.toString(),
        tmdb_id: detail.ids.tmdb,
        title: detail.title,
        year: detail.year,
        slug: detail.ids.slug,
        synopsis: detail.overview,
        runtime: detail.runtime,
        rating: {
          percentage: detail.rating,
          watching: detail.watching,
          votes: detail.votes,
          loved: 100,
          hated: 100
        },
        country: detail.country,
        last_updated: new Date(detail.updated_at).getTime(),
        images: detail.images,
        genres: detail.genres,
        released: new Date(detail.released).getTime(),
        trailer: detail.trailer,
        certification: detail.certification,
        language: detail.language,
        torrents: { "en": {} }
      }).save();
    } catch (e) {
      return logger.error(`${this.name}: Get images and save movie ${detail.title} failed: ${e.message}`);
    }
  }


  /**
   * Save new movie to database.
   * @param {Object} detail - Movie detail.
   * @param {Boolean} [retry=true] - Retry the function.
   * @returns {Promise} - Formatted data from one page.
   */

  async _newShow (detail) {
    try {
      let show = {
        _id: detail.ids.imdb || 'tmdb-' + detail.ids.tmdb || 'trakt-' + detail.ids.trakt.toString(),
        imdb_id: detail.ids.imdb || 'tmdb-' + detail.ids.tmdb || 'trakt-' + detail.ids.trakt.toString(),
        tvdb_id: detail.ids.tvdb,
        tmdb_id: detail.ids.tmdb,
        title: detail.title,
        year: detail.year,
        slug: detail.ids.slug,
        synopsis: detail.overview,
        runtime: detail.runtime,
        rating: {
          percentage: detail.rating,
          watching: detail.watching,
          votes: detail.votes,
          loved: 100,
          hated: 100
        },
        country: detail.country,
        network: detail.network,
        air_day: detail.first_aired,
        air_time: detail.airs.day + " " + detail.airs.time,
        status: detail.status,
        num_seasons: detail.num_seasons,
        aired_episodes: detail.aired_episodes,
        last_updated: new Date(detail.updated_at).getTime(),
        latest_episode: new Date(detail.updated_at).getTime(),
        images: detail.images,
        genres: detail.genres,
        language: detail.language,
        episodes: []
      }

      detail.episodes.forEach(episode => {
          show.episodes.push({
            torrents: {},
            watched: {
              "watched": false
            },
            first_aired: new Date(episode.first_aired).getTime(),
            date_based: false,
            overview: episode.overview,
            title: episode.title,
            episode: episode.number,
            season: episode.season,
            tvdb_id: episode.ids.tvdb,
            ids: episode.ids
          })
      })

      return await new Show(show).save();
    } catch (e) {
      return logger.error(`${this.name}: Get images and save show ${detail.title} failed: ${e.message}`);
    }
  }

  /**
   * All the found movies.
   * @returns {Array} - A list of all the found movies.
   */
  async _getMovies() {
    let done = false;
    let page = 0;
    return asyncq.until(() => {
      page++;
      return page >= 2;
    }, async () => {
      try {
        const movies = await trakt.movies.updates({
          start_date: '2014-09-17',
          limit: 100,
          page: page
        });

        logger.info(`${this.name}: Found ${movies.length} movies`);
        if (!movies || movies.length <= 0) {
          done = true;
        }

        await asyncq.mapSeries(movies, async movie => {
          if (movie.movie.year <= 1995 || (movie.movie.ids.tmdb == null && movie.movie.imdb == null)) {
            return
          }

          try {
            let images = await this._mHelper._getImages(movie.movie.ids["tmdb"], movie.movie.ids["imdb"]);
            let detail = await trakt.movies.summary({
              id: movie.movie.ids.trakt,
              extended: 'full'
            })

            detail.images = images;
            let traktWatchers = await trakt.movies.watching({
              id: movie.movie.ids.trakt
            });

            detail.watching = 0;
            if (traktWatchers !== null) detail.watching = traktWatchers.length;

            await this._newMovie(detail);
            logger.info(`${this.name}: Saved new movies ${detail.title}`);
            return await this._delay();
          } catch (e) {
            logger.warn(`${this.name}: Process movies ${movie.movie.ids.trakt} failed: ${e.message}`);
            return await this._delay();
          }
        })
      } catch (e) {
        logger.error(`Get trakt movies page ${page} failed: ${e.message}`);
        return await this._delay();
      }
    });
  }

  /**
   * All the found shows.
   * @returns {Array} - A list of all the found shows.
   */
  async _getShows() {
    let done = false;
    let page = 0;
    return asyncq.until(() => {
      page++;
      return page >= 2;
    }, async () => {
      try {
        const shows = await trakt.shows.updates({
          start_date: '2014-09-24',
          limit: 100,
          page: page
        });

        logger.info(`${this.name}: Found ${shows.length} shows`);
        if (!shows || shows.length <= 0) {
          done = true;
        }

        await asyncq.mapSeries(shows, async show => {
          if (show.show.year <= 1995 || (show.show.ids.tvdb == null && show.show.ids.tmdb == null)) {
            return
          }

          logger.info(`${this.name}: Quering show ${show.show.ids.trakt} detail`);
          try {
            let images = await this._sHelper._getImages(show.show.ids["tmdb"], show.show.ids["tvdb"], show.show.ids["imdb"]);
            let detail = await trakt.shows.summary({
              id: show.show.ids.trakt,
              extended: 'full'
            })

            detail.images = images;
            let episodes = [], finished = false;
            await asyncq.timesSeries(500, async (number) => {
              if (finished || number <= 0) {
                return;
              }

              try {
                let seasonEps = await trakt.seasons.season({
                  id: show.show.ids.trakt,
                  season: number,
                  extended: 'full'
                })

                if (!seasonEps || seasonEps.length <= 0) {
                  return finished = true;
                }

                logger.info(`${this.name}: Found ${seasonEps.length} episodes for show ${show.show.title}`);
                detail.num_seasons = number;
                episodes = episodes.concat(seasonEps);
              } catch (e) {
                return finished = true;
              }

              return await this._delay();
            })

            if (episodes.length > 0) {
              detail.episodes = episodes;
              let traktWatchers = await trakt.shows.watching({
                id: show.show.ids.trakt
              });

              detail.watching = 0;
              if (traktWatchers !== null) detail.watching = traktWatchers.length;
              await this._newShow(detail);
            }

            logger.info(`${this.name}: Finished shows ${detail.title}`);
            return await this._delay();
          } catch (e) {
            logger.warn(`${this.name}: Process shows ${show.show.ids.trakt} failed: ${e.message}`);
            return await this._delay();
          }
        })
      } catch (e) {
        logger.error(`${this.name}: Get trakt shows page ${page} failed: ${e.message}`)
      }
    });
  }

  /**
   * Returns a list of all the inserted torrents.
   * @returns {Movie[]} - A list of scraped movies.
   */
  async search() {
    try {
      logger.info(`${this.name}: Starting scraping...`);
      // await this._getMovies();
      return await this._getShows();
    } catch (err) {
      return this._util.onError(err);
    }
  }

}
