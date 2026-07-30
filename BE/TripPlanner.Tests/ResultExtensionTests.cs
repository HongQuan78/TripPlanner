using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Xunit;
using TripPlanner.API.Extensions;
using TripPlanner.Application.Common;
using TripPlanner.Application.UseCases.Auth;

namespace TripPlanner.Tests;

public class ResultExtensionTests
{
    [Fact]
    public void ToResponse_UnauthorizedFailure_MapsTo401()
    {
        var result = Result<string>.Failure(ErrorType.Unauthorized, "Invalid email or password.");

        var response = result.ToResponse(_ => Results.Ok());

        var problem = Assert.IsType<ProblemHttpResult>(response);
        Assert.Equal(StatusCodes.Status401Unauthorized, problem.StatusCode);
        Assert.Equal("Invalid email or password.", problem.ProblemDetails.Detail);
    }

    [Fact]
    public void ToResponse_UnauthorizedFailure_EmitsDescriptionAsProblemDetail()
    {
        var result = Result<string>.Failure(ErrorType.Unauthorized, LoginUserUseCase.NotVerifiedMessage);

        var response = result.ToResponse(_ => Results.Ok());

        var problem = Assert.IsType<ProblemHttpResult>(response);
        Assert.Equal(StatusCodes.Status401Unauthorized, problem.StatusCode);
        Assert.Equal("Your email address is not verified. Please check your inbox.", problem.ProblemDetails.Detail);
    }
}
