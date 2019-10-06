// Import the neccesary modules.
import mongoose from "mongoose";

// The movie schema used by mongoose.
const MovieSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    index: {
      unique: true
    }
  },
  imdb_id: String,
  tmdb_id: String,
  title: String,
  year: String,
  slug: String,
  synopsis: String,
  runtime: String,
  rating: {
    percentage: Number,
    watching: Number,
    votes: Number,
    loved: Number,
    hated: Number
  },
  country: String,
  last_updated: Number,
  images: {
    banner: String,
    fanart: String,
    poster: String
  },
  genres: [],
  released: Number,
  trailer: {
    type: String,
    default: null
  },
  certification: String,
  language: String,
  torrents: {}
}, { minimize: false });

// Create the movie model.
const Movie = mongoose.model("Movie", MovieSchema);

/**
 * A model object for movies.
 * @type {Movie}
 */
export default Movie;
