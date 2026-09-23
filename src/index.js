export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("Car-Km-Tracker online", { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  }
};
