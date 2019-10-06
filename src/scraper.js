// Import the neccesary modules.
import asyncq from "async-q";

import EZTV from "./providers/shows/eztv";
import HorribleSubs from "./providers/anime/horriblesubs";
import extratorrentAnime from "./providers/anime/extratorrent";
import extratorrentMovie from "./providers/movies/extratorrent";
import extratorrentShow from "./providers/shows/extratorrent";
import katAnime from "./providers/anime/kat";
import katMovie from "./providers/movies/kat";
import katShow from "./providers/shows/kat";
import Nyaa from "./providers/anime/nyaa";
import YTS from "./providers/movies/yts";
import Trakt from "./providers/trakt.tv";
import Util from "./util";
import {
  collections,
  extratorrentAnimeProviders,
  extratorrentMovieProviders,
  extratorrentShowProviders,
  katAnimeProviders,
  katMovieProviders,
  katShowProviders,
  nyaaAnimeProviders
} from "./config/constants";

/** Class for scraping movies and shows. */
export default class Scraper {

  /**
   * Create a scraper object.
   * @param {?Boolean} debug - Debug mode for extra output.
   */
  constructor(debug) {
    /**
     * The util object with general functions.
     * @type {Util}
     */
    Scraper._util = new Util();

    /**
     * Debug mode for extra output.
     * @type {Boolean}
     */
    Scraper._debug = debug;
  }

  /**
   * Start show scraping from ExtraTorrent.
   * @returns {Show[]} A list of all the scraped shows.
   */
  async _scrapeTrakt() {
    try {
      const trakt = new Trakt("Trakt");
      Scraper._util.setStatus(`Scraping ${trakt.name}`);
      const traktData = await trakt.search();
      logger.info(`${trakt.name}: Done.`);
      return traktData;
    } catch (err) {
      return Scraper._util.onError(err);
    }
  }

  /**
   * Start show scraping from ExtraTorrent.
   * @returns {Show[]} A list of all the scraped shows.
   */
  _scrapeExtraTorrentShows() {
    return asyncq.concatSeries(extratorrentShowProviders, async provider => {
      try {
        Scraper._util.setStatus(`Scraping ${provider.name}`);
        const extratorrentProvider = new extratorrentShow(provider.name, Scraper._debug);
        const extratorrentShows = await extratorrentProvider.search(provider);
        logger.info(`${provider.name}: Done.`);
        return extratorrentShows;
      } catch (err) {
        return Scraper._util.onError(err);
      }
    });
  }

  /**
   * Start scraping from EZTV.
   * @returns {Show[]} A list of all the scraped shows.
   */
  async _scrapeEZTVShows() {
    try {
      const eztv = new EZTV("EZTV", Scraper._debug);
      Scraper._util.setStatus(`Scraping ${eztv.name}`);
      const eztvShows = await eztv.search();
      logger.info(`${eztv.name}: Done.`);
      return eztvShows;
    } catch (err) {
      return Scraper._util.onError(err);
    }
  }

  /**
   * Start show scraping from KAT.
   * @returns {Show[]} A list of all the scraped shows.
   */
  _scrapeKATShows() {
    return asyncq.concatSeries(katShowProviders, async provider => {
      try {
        Scraper._util.setStatus(`Scraping ${provider.name}`);
        const katProvider = new katShow(provider.name, Scraper._debug);
        const katShows = await katProvider.search(provider);
        logger.info(`${provider.name}: Done.`);
        return katShows;
      } catch (err) {
        return Scraper._util.onError(err);
      }
    });
  }

  /**
   * Start movie scraping from ExtraTorrent.
   * @returns {Movie[]} A list of all the scraped movies.
   */
  _scrapeExtraTorrentMovies() {
    return asyncq.concatSeries(extratorrentMovieProviders, async provider => {
      try {
        Scraper._util.setStatus(`Scraping ${provider.name}`);
        const extratorrentProvider = new extratorrentMovie(provider.name, Scraper._debug);
        const extratorrentMovies = await extratorrentProvider.search(provider);
        logger.info(`${provider.name}: Done.`);
        return extratorrentMovies;
      } catch (err) {
        return Scraper._util.onError(err);
      }
    });
  }

  /**
   * Start movie scraping from KAT.
   * @returns {Movie[]} A list of all the scraped movies.
   */
  _scrapeKATMovies() {
    return asyncq.concatSeries(katMovieProviders, async provider => {
      try {
        Scraper._util.setStatus(`Scraping ${provider.name}`);
        const katProvider = new katMovie(provider.name, Scraper._debug);
        const katShows = await katProvider.search(provider);
        logger.info(`${provider.name}: Done.`);
        return katShows;
      } catch (err) {
        return Scraper._util.onError(err);
      }
    });
  }

  /**
   * Start scraping from YTS.
   * @returns {Movie[]} A list of all the scraped movies.
   */
  async _scrapeYTSMovies() {
    try {
      const yts = new YTS("YTS");
      Scraper._util.setStatus(`Scraping ${yts.name}`);
      const ytsMovies = await yts.search();
      logger.info(`${yts.name}: Done.`);
      return ytsMovies;
    } catch (err) {
      return Scraper._util.onError(err);
    }
  }

  /**
   * Start anime scraping from ExtraTorrent.
   * @returns {Anime[]} A list of all the scraped movies.
   */
  _scrapeExtraTorrentAnime() {
    return asyncq.concatSeries(extratorrentAnimeProviders, async provider => {
      try {
        Scraper._util.setStatus(`Scraping ${provider.name}`);
        const extratorrentProvider = new extratorrentAnime(provider.name, Scraper._debug);
        const extratorrentAnimes = await extratorrentProvider.search(provider);
        logger.info(`${provider.name}: Done.`);
        return extratorrentAnimes;
      } catch (err) {
        return Scraper._util.onError(err);
      }
    });
  }

  /**
   * Start scraping from HorribleSubs.
   * @returns {Anime[]} A list of all the scraped anime.
   */
  async _scrapeHorribleSubsAnime() {
    try {
      const horribleSubs = new HorribleSubs("HorribleSubs", Scraper._debug);
      Scraper._util.setStatus(`Scraping ${horribleSubs.name}`);
      const horribleSubsAnime = await horribleSubs.search();
      logger.info(`${horribleSubs.name}: Done.`);
      return horribleSubsAnime;
    } catch (err) {
      return Scraper._util.onError(err);
    }
  }

  /**
   * Start scraping from KAT.
   * @returns {Anime[]} A list of all the scraped anime.
   */
  async _scrapeKATAnime() {
    return asyncq.concatSeries(katAnimeProviders, async provider => {
      try {
        Scraper._util.setStatus(`Scraping ${provider.name}`);
        const katProvider = new katAnime(provider.name, Scraper._debug);
        const katAnimes = await katProvider.search(provider);
        logger.info(`${provider.name}: Done.`);
        return katAnimes;
      } catch (err) {
        return Scraper._util.onError(err);
      }
    });
  }

  /**
   * Start scraping from Nyaa.
   * @returns {Anime[]} A list of all the scraped anime.
   */
  async _scrapeNyaaAnime() {
    return asyncq.concatSeries(nyaaAnimeProviders, async provider => {
      try {
        Scraper._util.setStatus(`Scraping ${provider.name}`);
        const nyaaProvider = new Nyaa(provider.name, Scraper._debug);
        const nyaaAnimes = await nyaaProvider.search(provider);
        logger.info(`${provider.name}: Done.`);
        return nyaaAnimes;
      } catch (err) {
        return Scraper._util.onError(err);
      }
    });
  }

  /** Initiate the scraping. */
  scrape() {
    Scraper._util.setLastUpdated();

    asyncq.eachSeries([
      this._scrapeTrakt,
      // this._scrapeEZTVShows,
      // this._scrapeExtraTorrentShows,
      // this._scrapeKATShows,
      //
      // this._scrapeExtraTorrentMovies,
      // this._scrapeKATMovies,
      // this._scrapeYTSMovies,

      // this._scrapeExtraTorrentAnime,
      // this._scrapeHorribleSubsAnime,
      // this._scrapeKATAnime,
      // this._scrapeNyaaAnime
    ], scraper => scraper())
      .then(() => Scraper._util.setStatus())
      .then(() => asyncq.eachSeries(collections, collection => Scraper._util.exportCollection(collection)))
      .catch(err => Scraper._util.onError(`Error while scraping: ${err}`));
  }

}
