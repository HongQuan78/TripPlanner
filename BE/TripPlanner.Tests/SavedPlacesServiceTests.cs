using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.Services;
using TripPlanner.Application.UseCases.SavedPlaces;
using TripPlanner.Domain.Models;

namespace TripPlanner.Tests;

public class SavedPlacesServiceTests
{
    private readonly ITripRepository _tripRepository = Substitute.For<ITripRepository>();
    private readonly IDestinationRepository _destinationRepository = Substitute.For<IDestinationRepository>();
    private readonly IDestinationDetailsService _destinationDetailsService = Substitute.For<IDestinationDetailsService>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IApplicationMapper _mapper = Substitute.For<IApplicationMapper>();

    private AddDestinationToSavedPlacesUseCase AddUseCase() =>
        new(_tripRepository, new DestinationResolver(_destinationRepository, _destinationDetailsService), _unitOfWork, _mapper);

    private RemoveDestinationFromSavedPlacesUseCase RemoveUseCase() =>
        new(_tripRepository, _unitOfWork);

    private ScheduleSavedPlaceUseCase ScheduleUseCase() =>
        new(_tripRepository, _unitOfWork, _mapper);

    [Fact]
    public async Task AddDestinationToSavedPlaces_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await AddUseCase().ExecuteAsync(1, new AddSavedPlaceRequest { DestinationId = 1 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToSavedPlaces_TripOwnedByAnotherUser_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 2, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await AddUseCase().ExecuteAsync(1, new AddSavedPlaceRequest { DestinationId = 1 }, 2);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
    }

    [Fact]
    public async Task AddDestinationToSavedPlaces_DestinationNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(99, Arg.Any<CancellationToken>()).Returns((Destination?)null);

        var result = await AddUseCase().ExecuteAsync(1, new AddSavedPlaceRequest { DestinationId = 99 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToSavedPlaces_ValidInput_AddsToPoolAndReturnsSuccess()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        var expected = new TripResponse { Id = 1, Name = "Test" };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(0, Arg.Any<CancellationToken>()).Returns(destination);
        _mapper.MapToTripResponse(Arg.Any<Trip>()).Returns(expected);

        var result = await AddUseCase().ExecuteAsync(1, new AddSavedPlaceRequest { DestinationId = 0 }, 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        Assert.Contains(destination, trip.SavedPlaces);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToSavedPlaces_DestinationAlreadyInPool_ReturnsBadRequestFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var existing = new Landmark("Louvre", 4.9, "9am-6pm");
        trip.AddSavedPlace(existing);

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(0, Arg.Any<CancellationToken>()).Returns(existing);

        var result = await AddUseCase().ExecuteAsync(1, new AddSavedPlaceRequest { DestinationId = 0 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        Assert.Equal("Destination already exists in Saved Places.", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToSavedPlaces_XidNotImported_CreatesDestinationFromProviderDetails()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var details = new DestinationDetailsResponse
        {
            Xid = "W123",
            Name = "Eiffel Tower",
            Category = "architecture",
            Rating = 3,
            OpeningHours = "9am-11pm"
        };
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>()).Returns(details);
        _mapper.MapToTripResponse(Arg.Any<Trip>()).Returns(new TripResponse());

        var result = await AddUseCase().ExecuteAsync(1, new AddSavedPlaceRequest { Xid = "W123" }, 1);

        Assert.True(result.IsSuccess);
        var added = Assert.Single(trip.SavedPlaces);
        Assert.Equal("W123", added.ExternalId);
        _destinationRepository.Received(1).Add(Arg.Is<Destination>(x => x.ExternalId == "W123"));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToSavedPlaces_ProviderUnavailable_ReturnsServiceUnavailableFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("boom"));

        var result = await AddUseCase().ExecuteAsync(1, new AddSavedPlaceRequest { Xid = "W123" }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
    }

    [Fact]
    public async Task RemoveDestinationFromSavedPlaces_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await RemoveUseCase().ExecuteAsync(1, 1, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromSavedPlaces_NotInPool_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await RemoveUseCase().ExecuteAsync(1, 99, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination is not in Saved Places.", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromSavedPlaces_ValidInput_RemovesAndReturnsSuccess()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        trip.AddSavedPlace(destination);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await RemoveUseCase().ExecuteAsync(1, 0, 1);

        Assert.True(result.IsSuccess);
        Assert.Empty(trip.SavedPlaces);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ScheduleSavedPlace_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await ScheduleUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 1, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task ScheduleSavedPlace_DayNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await ScheduleUseCase().ExecuteAsync(1, new DateOnly(2024, 7, 1), 1, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Day Not Found", result.Error.Description);
    }

    [Fact]
    public async Task ScheduleSavedPlace_DestinationNotInPool_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await ScheduleUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 99, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination is not in Saved Places.", result.Error.Description);
    }

    [Fact]
    public async Task ScheduleSavedPlace_AlreadyOnDay_ReturnsBadRequestAndLeavesPoolUnchanged()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        trip.AddSavedPlace(destination);
        trip.Days.First().AddDestination(destination);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await ScheduleUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 0, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        Assert.Equal("Destination already exists in this day.", result.Error.Description);
        Assert.Contains(destination, trip.SavedPlaces);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ScheduleSavedPlace_ValidInput_MovesFromPoolToDay()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        trip.AddSavedPlace(destination);
        var expected = new TripResponse { Id = 1 };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _mapper.MapToTripResponse(Arg.Any<Trip>()).Returns(expected);

        var result = await ScheduleUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 0, 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        Assert.Empty(trip.SavedPlaces);
        Assert.Contains(destination, trip.Days.First().Destinations);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
