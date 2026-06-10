namespace TripPlanner.Application.Common;

public sealed record Result<T>
{
    public bool IsSuccess { get; init; }
    public T? Data { get; init; }
    public Error? Error { get; init; }

    public static Result<T> Success(T data) => new()
    {
        IsSuccess = true,
        Data = data
    };

    public static Result<T> Failure(ErrorType errorType, string description) => new()
    {
        IsSuccess = false,
        Error = new()
        {
            Description = description,
            ErrorType = errorType
        }
    };
}

public sealed record Result
{
    public bool IsSuccess { get; init; }
    public Error? Error { get; init; }

    public static Result Success() => new()
    {
        IsSuccess = true,
    };

    public static Result Failure(ErrorType errorType, string description) => new()
    {
        IsSuccess = false,
        Error = new()
        {
            Description = description,
            ErrorType = errorType
        }
    };
}
