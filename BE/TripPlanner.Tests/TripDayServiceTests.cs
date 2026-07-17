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
        new(_tripRepository, new DestinationResolver(_destinationRepository, _destinationDetailsService), _unitOfWork, _mapper);

    private RemoveDestinationFromTripDayUseCase RemoveUseCase() =>
        new(_tripRepository, _unitOfWork);

    private ReorderDayDestinationsUseCase ReorderUseCase() =>
        new(_tripRepository, _unitOfWork, _mapper);

    private static T SetId<T>(T destination, int id) where T : Destination
    {
        typeof(Destination)
            .GetProperty(nameof(Destination.Id))!
            .SetValue(destination, id);
        return destination;
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 1 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 2, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 1 }, 2);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_DayNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 7, 1), new AddDestinationToDayRequest { DestinationId = 1 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Day Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_DestinationNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(99, Arg.Any<CancellationToken>()).Returns((Destination?)null);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 99 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_DestinationAlreadyOnDay_ReturnsBadRequestFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var tripDay = trip.Days.First();
        var existing = new Landmark("Eiffel Tower", 4.8, "9am-11pm");
        tripDay.AddDestination(existing);

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(0, Arg.Any<CancellationToken>()).Returns(existing);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 0 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_ValidInput_ReturnsSuccessResult()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        var expected = new TripDayResponse { Day = new DateOnly(2024, 6, 1) };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByIdAsync(0, Arg.Any<CancellationToken>()).Returns(destination);
        _mapper.MapToTripDayResponse(Arg.Any<TripDay>()).Returns(expected);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { DestinationId = 0 }, 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_NoDestinationIdOrXid_ReturnsBadRequestFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest(), 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        Assert.Equal("Either DestinationId or Xid is required.", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidAlreadyImported_ReusesExistingDestination()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var existing = new Landmark("Eiffel Tower", 4.8, "9am-11pm", "W123");
        var expected = new TripDayResponse { Day = new DateOnly(2024, 6, 1) };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns(existing);
        _mapper.MapToTripDayResponse(Arg.Any<TripDay>()).Returns(expected);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W123" }, 1);

        Assert.True(result.IsSuccess);
        Assert.Contains(existing, trip.Days.First().Destinations);
        _destinationRepository.DidNotReceive().Add(Arg.Any<Destination>());
        await _destinationDetailsService.DidNotReceive().GetDetailsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidNotImported_CreatesLandmarkFromProviderDetails()
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
        var expected = new TripDayResponse { Day = new DateOnly(2024, 6, 1) };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>()).Returns(details);
        _mapper.MapToTripDayResponse(Arg.Any<TripDay>()).Returns(expected);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W123" }, 1);

        Assert.True(result.IsSuccess);
        var added = Assert.Single(trip.Days.First().Destinations);
        var landmark = Assert.IsType<Landmark>(added);
        Assert.Equal("Eiffel Tower", landmark.Name);
        Assert.Equal("W123", landmark.ExternalId);
        Assert.Equal("Landmark", landmark.Category);
        Assert.Equal(3, landmark.Rating);
        _destinationRepository.Received(1).Add(Arg.Is<Destination>(x => x.ExternalId == "W123"));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidNotImported_CreatesRestaurantFromProviderDetails()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var details = new DestinationDetailsResponse
        {
            Xid = "W456",
            Name = "Pho Corner",
            Category = "foods",
            Rating = 2,
            OpeningHours = "8am-9pm"
        };
        var expected = new TripDayResponse { Day = new DateOnly(2024, 6, 1) };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W456", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W456", Arg.Any<CancellationToken>()).Returns(details);
        _mapper.MapToTripDayResponse(Arg.Any<TripDay>()).Returns(expected);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W456" }, 1);

        Assert.True(result.IsSuccess);
        var added = Assert.Single(trip.Days.First().Destinations);
        var restaurant = Assert.IsType<Restaurant>(added);
        Assert.Equal("Pho Corner", restaurant.Name);
        Assert.Equal("W456", restaurant.ExternalId);
        Assert.Equal("Restaurant", restaurant.Category);
        Assert.Equal("foods", restaurant.CuisineType);
        Assert.False(restaurant.IsHalalFriendly);
        Assert.Equal(2, restaurant.Rating);
        _destinationRepository.Received(1).Add(Arg.Is<Destination>(x => x.ExternalId == "W456"));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidUnknownToProvider_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W404", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W404", Arg.Any<CancellationToken>()).Returns((DestinationDetailsResponse?)null);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W404" }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_ProviderUnavailableDuringImport_ReturnsServiceUnavailableFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns((Destination?)null);
        _destinationDetailsService.GetDetailsAsync("W123", Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("boom"));

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W123" }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.ServiceUnavailable, result.Error!.ErrorType);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_XidDestinationAlreadyOnDay_ReturnsBadRequestFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var existing = new Landmark("Eiffel Tower", 4.8, "9am-11pm", "W123");
        trip.Days.First().AddDestination(existing);

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _destinationRepository.GetByExternalIdAsync("W123", Arg.Any<CancellationToken>()).Returns(existing);

        var result = await AddUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new AddDestinationToDayRequest { Xid = "W123" }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 1, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 2, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 1, 2);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_DayNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 7, 15), 1, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Day Not Found", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_DestinationNotOnDay_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 99, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination is not scheduled on this day.", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_ValidInput_ReturnsSuccessResult()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var destination = new Landmark("Eiffel Tower", 4.8, "9am-11pm");
        trip.Days.First().AddDestination(destination);

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await RemoveUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), 0, 1);

        Assert.True(result.IsSuccess);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReorderDayDestinationsAsync_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await ReorderUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new[] { 1, 2 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReorderDayDestinationsAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 2, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await ReorderUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new[] { 1, 2 }, 2);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task ReorderDayDestinationsAsync_DayNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await ReorderUseCase().ExecuteAsync(1, new DateOnly(2024, 7, 1), new[] { 1, 2 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Day Not Found", result.Error.Description);
    }

    [Fact]
    public async Task ReorderDayDestinationsAsync_IdSetMismatch_ReturnsBadRequestAndLeavesOrderUnchanged()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var tripDay = trip.Days.First();
        tripDay.AddDestination(SetId(new Landmark("First", 4.0, "9am-5pm"), 1));
        tripDay.AddDestination(SetId(new Landmark("Second", 4.1, "9am-5pm"), 2));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await ReorderUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new[] { 1, 99 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        Assert.Equal("Destination order must list exactly the destinations currently in this day.", result.Error.Description);
        Assert.Equal(new[] { 1, 2 }, tripDay.Destinations.Select(x => x.Id));
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReorderDayDestinationsAsync_DuplicateIds_ReturnsBadRequest()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var tripDay = trip.Days.First();
        tripDay.AddDestination(SetId(new Landmark("First", 4.0, "9am-5pm"), 1));
        tripDay.AddDestination(SetId(new Landmark("Second", 4.1, "9am-5pm"), 2));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await ReorderUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new[] { 1, 1 }, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.BadRequest, result.Error!.ErrorType);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReorderDayDestinationsAsync_ValidPermutation_ReordersAndReturnsMappedTrip()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var tripDay = trip.Days.First();
        tripDay.AddDestination(SetId(new Landmark("First", 4.0, "9am-5pm"), 1));
        tripDay.AddDestination(SetId(new Landmark("Second", 4.1, "9am-5pm"), 2));
        tripDay.AddDestination(SetId(new Landmark("Third", 4.2, "9am-5pm"), 3));
        var expected = new TripResponse { Id = 1, Name = "Test" };

        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _mapper.MapToTripResponse(trip).Returns(expected);

        var result = await ReorderUseCase().ExecuteAsync(1, new DateOnly(2024, 6, 1), new[] { 3, 1, 2 }, 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        Assert.Equal(new[] { 3, 1, 2 }, tripDay.Destinations.Select(x => x.Id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
