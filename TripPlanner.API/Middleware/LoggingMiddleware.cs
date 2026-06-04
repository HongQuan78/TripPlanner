using System.Diagnostics;

namespace TripPlanner.API.Middleware;

public class LoggingMiddleware(RequestDelegate next, ILogger<LoggingMiddleware> logger)
{
    public async Task Invoke(HttpContext context)
    {
        var correlationId = EnsureCorrelationId(context);
        var watch = Stopwatch.StartNew();

        try
        {
            await next(context);
        }
        finally
        {
            watch.Stop();

            logger.LogInformation(
                "[{CorrelationId}] {Method} {Path} Responded {StatusCode} in {Elapsed} ms",
                correlationId,
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                watch.ElapsedMilliseconds
            );
        }
    }

    private static string EnsureCorrelationId(HttpContext context)
    {
        const string header = "X-Correlation-ID";

        if (!context.Request.Headers.TryGetValue(header, out var correlationId))
        {
            correlationId = Guid.NewGuid().ToString();
            context.Request.Headers[header] = correlationId;
        }

        context.Response.Headers[header] = correlationId;
        return correlationId!;
    }
}