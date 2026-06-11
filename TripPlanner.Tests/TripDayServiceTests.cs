using AutoMapper;
using NSubstitute;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces;
using TripPlanner.Application.UseCases.Implementations;
using TripPlanner.Domain.Models;

namespace TripPlanner.Tests;

public class TripDayServiceTests
{
    private readonly ITripRepository _tripRepository = Substitute.For<ITripRepository>();
    private readonly IDestinationRepository _destinationRepository = Substitute.For<IDestinationRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IMapper _mapper = Substitute.For<IMapper>();
    private readonly TripDayService _sut;

    public TripDayServiceTests()
    {
        _sut = new TripDayService(_tripRepository, _destinationRepository, _unitOfWork, _mapper);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await _sut.AddDestinationToTripDayAsync(1, "2024-06-01", new AddDestinationToDayRequest { DestinationId = 1 });

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task AddDestinationToTripDayAsync_DayNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await _sut.AddDestinationToTripDayAsync(1, "2024-07-01", new AddDestinationToDayRequest { DestinationId = 1 });

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

        var result = await _sut.AddDestinationToTripDayAsync(1, "2024-06-01", new AddDestinationToDayRequest { DestinationId = 99 });

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

        var result = await _sut.AddDestinationToTripDayAsync(1, "2024-06-01", new AddDestinationToDayRequest { DestinationId = 0 });

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
        _mapper.Map<TripDayResponse>(Arg.Any<TripDay>()).Returns(expected);

        var result = await _sut.AddDestinationToTripDayAsync(1, "2024-06-01", new AddDestinationToDayRequest { DestinationId = 0 });

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await _sut.RemoveDestinationFromTripDayAsync(1, "2024-06-01", 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Trip Not Found", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_DayNotFound_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await _sut.RemoveDestinationFromTripDayAsync(1, "2024-07-15", 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Day Not Found", result.Error.Description);
    }

    [Fact]
    public async Task RemoveDestinationFromTripDayAsync_DestinationNotOnDay_ReturnsNotFoundFailure()
    {
        var trip = new Trip("Test", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await _sut.RemoveDestinationFromTripDayAsync(1, "2024-06-01", 99);

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

        var result = await _sut.RemoveDestinationFromTripDayAsync(1, "2024-06-01", 0);

        Assert.True(result.IsSuccess);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
