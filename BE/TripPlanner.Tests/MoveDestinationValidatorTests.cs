using Xunit;
using TripPlanner.API.Parameters;
using TripPlanner.API.Validators;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.Tests;

public class MoveDestinationRequestValidatorTests
{
    private readonly MoveDestinationRequestValidator _validator = new();

    [Fact]
    public void Validate_ValidToDate_IsValid()
    {
        var result = _validator.Validate(new MoveDestinationRequest { ToDate = "2026-08-02" });

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("2026/08/02")]
    [InlineData("02-08-2026")]
    [InlineData("not-a-date")]
    public void Validate_MissingOrMalformedToDate_IsInvalid(string? toDate)
    {
        var result = _validator.Validate(new MoveDestinationRequest { ToDate = toDate });

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(MoveDestinationRequest.ToDate));
    }
}

public class MoveDestinationParameterValidatorTests
{
    private readonly MoveDestinationParameterValidator _validator = new(new MoveDestinationRequestValidator());

    private static MoveDestinationParameter Base() => new()
    {
        Id = 1,
        Date = "2026-08-01",
        DestinationId = 42,
        MoveDestinationRequest = new MoveDestinationRequest { ToDate = "2026-08-02" },
    };

    [Fact]
    public void Validate_WellFormedParameter_IsValid()
    {
        var result = _validator.Validate(Base());

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_NonPositiveDestinationId_IsInvalid(int destinationId)
    {
        var parameter = Base() with { DestinationId = destinationId };

        var result = _validator.Validate(parameter);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(MoveDestinationParameter.DestinationId));
    }

    [Theory]
    [InlineData("")]
    [InlineData("2026/08/01")]
    [InlineData("bogus")]
    public void Validate_MalformedSourceDate_IsInvalid(string date)
    {
        var parameter = Base() with { Date = date };

        var result = _validator.Validate(parameter);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(MoveDestinationParameter.Date));
    }

    [Fact]
    public void Validate_NullRequestBody_IsInvalid()
    {
        var parameter = Base() with { MoveDestinationRequest = null };

        var result = _validator.Validate(parameter);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(MoveDestinationParameter.MoveDestinationRequest));
    }

    [Fact]
    public void Validate_MalformedToDateInNestedRequest_IsInvalid()
    {
        var parameter = Base() with { MoveDestinationRequest = new MoveDestinationRequest { ToDate = "nope" } };

        var result = _validator.Validate(parameter);

        Assert.False(result.IsValid);
    }
}
