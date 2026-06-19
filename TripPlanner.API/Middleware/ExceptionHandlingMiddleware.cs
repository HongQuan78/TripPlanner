using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace TripPlanner.API.Middleware;

public class ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var correlationId = httpContext.Items[LoggingMiddleware.CorrelationIdKey]?.ToString()
            ?? httpContext.TraceIdentifier;

        logger.LogError(exception, "Unhandled exception. CorrelationId: {CorrelationId}", correlationId);

        var (statusCode, title, detail) = exception switch
        {
            BadHttpRequestException e => (StatusCodes.Status400BadRequest, "Bad Request", e.Message),
            JsonException e           => (StatusCodes.Status400BadRequest, "Bad Request", e.Message),
            _                         => (StatusCodes.Status500InternalServerError, "Internal Server Error", "An unexpected error occurred.")
        };

        var problemDetail = new ProblemDetails
        {
            Status   = statusCode,
            Title    = title,
            Detail   = detail,
            Instance = httpContext.Request.Path,
            Extensions = { ["correlationId"] = correlationId }
        };

        httpContext.Response.ContentType = "application/problem+json";
        httpContext.Response.StatusCode  = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetail, cancellationToken);

        return true;
    }
}
