using TripPlanner.Application.Common;

namespace TripPlanner.API.Extensions;

public static class ResultExtension
{
    public static IResult ToResponse<T>(this Result<T> result, Func<T, IResult> onSuccess)
    {
        if (!result.IsSuccess)
        {
            return Results.Problem(
                statusCode: ToStatusCode(result.Error!.ErrorType),
                title: ToTitle(result.Error!.ErrorType),
                detail: result.Error!.Description
            );
        }

        return onSuccess(result.Data!);
    }

    public static IResult ToResponse(this Result result, Func<IResult> onSuccess)
    {
        if (!result.IsSuccess)
        {
            return Results.Problem(
                statusCode: ToStatusCode(result.Error!.ErrorType),
                title: ToTitle(result.Error!.ErrorType),
                detail: result.Error!.Description
            );
        }

        return onSuccess();
    }

    private static int ToStatusCode(ErrorType errorType) => errorType switch
    {
        ErrorType.BadRequest => StatusCodes.Status400BadRequest,
        ErrorType.NotFound   => StatusCodes.Status404NotFound,
        _                    => StatusCodes.Status500InternalServerError
    };

    private static string ToTitle(ErrorType errorType) => errorType switch
    {
        ErrorType.BadRequest => "Bad Request",
        ErrorType.NotFound   => "Not Found",
        _                    => "Internal Server Error"
    };
}
