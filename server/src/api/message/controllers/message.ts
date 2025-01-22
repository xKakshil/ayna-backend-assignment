import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::message.message",
  ({ strapi }) => ({
    async find(ctx) {
      const filters =
        ctx.query.filters && typeof ctx.query.filters === "object"
          ? ctx.query.filters
          : {};

      ctx.query.filters = {
        ...filters,
        user: ctx.state.user.id,
      };

      const { data, meta } = await super.find(ctx);
      return { data, meta };
    },

    async create(ctx) {
      ctx.request.body.data.user = ctx.state.user.id;
      const response = await super.create(ctx);
      return response;
    },
  })
);
