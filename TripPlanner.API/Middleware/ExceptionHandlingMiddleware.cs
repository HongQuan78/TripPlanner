using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace TripPlanner.API.Middleware;

public class ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {   
        
        logger.LogError(exception, "Unhandled exception occurred. Trace Id: {TraceId}", httpContext.TraceIdentifier);

        var (statusCode, title) = exception switch
        {
            BadHttpRequestException => (StatusCodes.Status400BadRequest, "Bad Request"),
            JsonException => (StatusCodes.Status400BadRequest, "Bad Request"),
            _ => (StatusCodes.Status500InternalServerError, "An Unexpected Error Occurred")
        };

        var problemDetail = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = "An unexpected error occurred.",
            Instance = httpContext.Request.Path,
        };

        httpContext.Response.StatusCode = problemDetail.Status.Value;
        await httpContext.Response.WriteAsJsonAsync(problemDetail, cancellationToken);

        return true;
    }
}