using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.UseCases.Location;

namespace TripPlanner.Tests;

public class GetDestinationDetailsUseCaseTests
{
    private readonly IDestinationDetailsService _destinationDetailsService = Substitute.For<IDestinationDetailsService>();

    private GetDestinationDetailsUseCase UseCase() => new(_destinationDetailsService);

    [Fact]
    public async Task GetDestinationDetails_ValidXid_ReturnsSuccessWithDetails()
    {
        var details = new DestinationDetailsResponse
        {
            Xid = "W123",
            Name = "Eiffel Tower",
            Category = "architecture",
            Description = "A wrought-iron lattice tower in Paris.",
            ImageUrls = ["https://example.com/eiffel.jpg"],
            Address = "Champ de Mars, Paris, France",
            Website = "https://www.toureiffel.paris",
            Latitude = 48.858,
            Longitude = 2.294
        };
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>()).Returns(details);

        var result = await UseCase().ExecuteAsync("W123");

        Assert.True(result.IsSuccess);
        Assert.Equal(details, result.Data);
    }

    [Fact]
    public async Task GetDestinationDetails_TrimsXidBeforeFetching()
    {
        var details = new DestinationDetailsResponse { Xid = "W123", Name = "Eiffel Tower" };
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>()).Returns(details);

        var result = await UseCase().ExecuteAsync("  W123  ");

        Assert.True(result.IsSuccess);
        await _destinationDetailsService.Received(1).GetDetailsAsync("W123", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetDestinationDetails_SparseProviderData_StillReturnsSuccess()
    {
        var details = new DestinationDetailsResponse { Xid = "W123", Name = "Hidden Gem" };
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>()).Returns(details);

        var result = await UseCase().ExecuteAsync("W123");

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Data!.ImageUrls);
        Assert.Null(result.Data.Description);
        Assert.Null(result.Data.Address);
        Assert.Null(result.Data.OpeningHours);
        Assert.Null(result.Data.Website);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetDestinationDetails_EmptyOrWhitespaceXid_ReturnsBadRequestFailure(string xid)
    {
        var result = await UseCase().ExecuteAsync(xid);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        await _destinationDetailsService.DidNotReceive().GetDetailsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetDestinationDetails_UnknownXid_ReturnsNotFoundFailure()
    {
        _destinationDetailsService.GetDetailsAsync("W404", Arg.Any<CancellationToken>()).Returns((DestinationDetailsResponse?)null);

        var result = await UseCase().ExecuteAsync("W404");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination Not Found", result.Error.Description);
    }

    [Fact]
    public async Task GetDestinationDetails_ProviderUnavailable_ReturnsServiceUnavailableFailure()
    {
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("boom"));

        var result = await UseCase().ExecuteAsync("W123");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
        Assert.Equal("Destination details are currently unavailable.", result.Error.Description);
    }

    [Fact]
    public async Task GetDestinationDetails_ProviderTimeout_ReturnsServiceUnavailableFailure()
    {
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>())
            .ThrowsAsync(new TaskCanceledException());

        var result = await UseCase().ExecuteAsync("W123");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
    }
}
