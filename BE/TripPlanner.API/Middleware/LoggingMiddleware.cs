using System.Diagnostics;

namespace TripPlanner.API.Middleware;

public class LoggingMiddleware(RequestDelegate next, ILogger<LoggingMiddleware> logger)
{
    private const string CorrelationIdHeader = "X-Correlation-ID";
    public const string CorrelationIdKey = "CorrelationId";

    public async Task Invoke(HttpContext context)
    {
        var correlationId = ExtractOrGenerateCorrelationId(context);
        context.Items[CorrelationIdKey] = correlationId;
        context.Response.Headers[CorrelationIdHeader] = correlationId;

        var watch = Stopwatch.StartNew();

        using (logger.BeginScope(new Dictionary<string, object> { [CorrelationIdKey] = correlationId }))
        {
            try
            {
                await next(context);
            }
            finally
            {
                watch.Stop();
                logger.LogInformation(
                    "{Method} {Path} responded {StatusCode} in {Elapsed}ms",
                    context.Request.Method,
                    context.Request.Path,
                    context.Response.StatusCode,
                    watch.ElapsedMilliseconds);
            }
        }
    }

    private static string ExtractOrGenerateCorrelationId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(CorrelationIdHeader, out var value)
            && !string.IsNullOrWhiteSpace(value))
        {
            return value!;
        }

        return Guid.NewGuid().ToString();
    }
}
