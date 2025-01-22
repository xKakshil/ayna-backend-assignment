import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::session.session",
  ({ strapi }) => ({
    async find(ctx) {
      // Ensure filters is an object before spreading
      const filters =
        ctx.query.filters && typeof ctx.query.filters === "object"
          ? ctx.query.filters
          : {};

      // Add a filter to only return sessions associated with the authenticated user
      ctx.query.filters = {
        ...filters,
        user: ctx.state.user.id, // Add user filter
      };

      // Call the default find method
      const { data, meta } = await super.find(ctx);

      return { data, meta };
    },

    async create(ctx) {
      // Automatically set the user field to the authenticated user's ID
      ctx.request.body.data.user = ctx.state.user.id;

      // Call the default create method
      const response = await super.create(ctx);

      return response;
    },
  })
);
