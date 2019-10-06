// Import the neccesary modules.
import asyncq from "async-q";
import EztvAPI from "eztv-api-pt";

import Show from "../../models/Show";
import Extractor from "../extractors/showextractor";
import Util from "../../util";
import { maxWebRequest } from "../../config/constants";

/** Class for scraping shows from https://eztv.ag/. */
export default class EZTV {

  /**
   * Create an eztv object for show content.
   * @param {String} name - The name of the torrent provider.
   * @param {?Boolean} debug - Debug mode for extra output.
   */
  constructor(name, debug) {
    /**
     * The name of the torrent provider.
     * @type {String}
     */
    this.name = name;

    /**
     * A configured EZTV API.
     * @type {EztvAPI}
     * @see https://github.com/ChrisAlderson/eztv-api-pt
     */
    this._eztv = new EztvAPI({ debug });

    /**
     * The extractor object for getting show data on torrents.
     * @type {Extractor}
     */
    this._extractor = new Extractor(this.name, this._eztv, debug);

    /**
     * The util object with general functions.
     * @type {Util}
     */
    this._util = new Util();
  }

  /**
   * Returns a list of all the inserted torrents.
   * @returns {Show[]} - A list of scraped shows.
   */
  async search() {
    try {
      logger.info(`${this.name}: Starting scraping...`);
      const shows = await this._eztv.getAllShows();
      logger.info(`${this.name}: Found ${shows.length} shows.`);
      return await asyncq.mapLimit(shows, 1, async show => {
        try {
          const found = await Show.findOne({ slug: show.slug }).exec();
          logger.info(`Processing show: slug - ${show.slug} - ${show.show} - ${show.id}`);
          if (!found || found.status != 'ended') {
            show = await this._eztv.getShowData(show);
            if (show.episodes && Object.keys(show.episodes).length >= 0) {
              logger.info(`Found eztv show imdb ${show.imdb}, ${Object.keys(show.episodes).length} seasons for ${show.slug}`);
              return await this._extractor.getShow(show);
            }

            return logger.warn(`Show ${show.slug} have no episodes`);
          }

          return logger.info(`Show ${show.slug} already finished`);
        } catch (err) {
          return this._util.onError(err);
        }
      });
    } catch (err) {
      return this._util.onError(err);
    }
  }

}
