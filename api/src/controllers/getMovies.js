const { Movie, Rating } = require("../db");

const getMovies = async () => {
  return await Movie.findAll({
    include: {
      model: Rating,
      attributes: ["rate", "review"],
      throught: {
        attributes: ["movie_id"],
      },
    },
  });
};

module.exports = {
  getMovies,
};
