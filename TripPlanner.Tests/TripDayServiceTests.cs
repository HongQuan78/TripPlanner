using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.UseCases.TripDay;
using TripPlanner.Domain.Models;

namespace TripPlanner.Tests;

public class TripDayServiceTests
{
    private readonly ITripRepository _tripRepository = Substitute.For<ITripRepository>();
    private readonly IDestinationRepository _destinationRepository = Substitute.For<IDestinationRepository>();
    private readonly IDestinationDetailsService _destinationDetailsService = Substitute.For<IDestinationDetailsService>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IApplicationMapper _mapper = Substitute.For<IApplicationMapper>();

    private AddDestinationToTripDayUseCase AddUseCase() =>
        new(_tripRepository, _destinationRepository, _destinationDetailsService, _unitOfWork, _mapper);

    private RemoveDestinationFromTripDayUseCase RemoveUseCase() =>
        new(_tripRepository, _unitOfWork);

    [Fact]
    public async Task AddDestinationToTripDayAsync_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 1 });

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_DayNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 7, 1), new AddDestinationToDayRequest { DestinationId = 1 });

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Day Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_DestinationNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(99, Arg.Any<CancellationToken>()).Returns((Destination?)null);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 99 });

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_DestinationAlreadyOnDay_ReturnsBadRequestFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        var tripDay = trip.Days.First();
        var existing = new Landmark("Eiffel Tower", 4.8, "9am-11pm");
        tripDay.AddDestination(existing);

        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(0, Arg.Any<CancellationToken>()).Returns(existing);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 0 });

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_ValidInput_ReturnsSuccessResult()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        var expected = new TripDayResponse { Day = new DateOnly(2024, 6, 1) };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(0, Arg.Any<CancellationToken>()).Returns(destination);
        _mapper.MapToTripDayResponse(Arg.Any<TripDay>()).Returns(expected);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 0 });

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_NoDestinationIdOrXid_ReturnsBadRequestFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest());

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        Assert.Equal("Either DestinationId or Xid is required.", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidAlreadyImported_ReusesExistingDestination()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        var existing = new Landmark("Eiffel Tower", 4.8, "9am-11pm", "W123");
        var expected = new TripDayResponse { Day = new DateOnly(2024, 6, 1) };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns(existing);
        _mapper.MapToTripDayResponse(Arg.Any<TripDay>()).Returns(expected);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W123" });

        Assert.True(result.IsSuccess);
        Assert.Contains(existing, trip.Days.First().Destinations);
        _destinationRepository.DidNotReceive().Add(Arg.Any<Destination>());
        await _destinationDetailsService.DidNotReceive().GetDetailsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidNotImported_CreatesDestinationFromProviderDetails()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        var details = new DestinationDetailsResponse { Xid = "W123", Name = "Eiffel Tower", OpeningHours = "9am-11pm" };
        var expected = new TripDayResponse { Day = new DateOnly(2024, 6, 1) };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>()).Returns(details);
        _mapper.MapToTripDayResponse(Arg.Any<TripDay>()).Returns(expected);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W123" });

        Assert.True(result.IsSuccess);
        var added = Assert.Single(trip.Days.First().Destinations);
        Assert.Equal("Eiffel Tower", added.Name);
        Assert.Equal("W123", added.ExternalId);
        _destinationRepository.Received(1).Add(Arg.Is<Destination>(x => x.ExternalId == "W123"));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidUnknownToProvider_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W404", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W404", Arg.Any<CancellationToken>()).Returns((DestinationDetailsResponse?)null);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W404" });

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_ProviderUnavailableDuringImport_ReturnsServiceUnavailableFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("boom"));

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W123" });

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidDestinationAlreadyOnDay_ReturnsBadRequestFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        var existing = new Landmark("Eiffel Tower", 4.8, "9am-11pm", "W123");
        trip.Days.First().AddDestination(existing);

        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns(existing);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W123" });

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_DayNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 7, 15), 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Day Not Found", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_DestinationNotOnDay_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 99);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination is not scheduled on this day.", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_ValidInput_ReturnsSuccessResult()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        var destination = new Landmark("Eiffel Tower", 4.8, "9am-11pm");
        trip.Days.First().AddDestination(destination);

        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 0);

        Assert.True(result.IsSuccess);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
