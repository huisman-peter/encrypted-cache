
class LocalWebServerSWAllowedMiddleware {
  middleware() {
    return async function (ctx, next) {
      ctx.response.set("Service-Worker-Allowed", "/");
      await next();
    };
  }
}
export default LocalWebServerSWAllowedMiddleware;
