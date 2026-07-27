using NSubstitute;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.UseCases.Trip;
using TripPlanner.Domain.Models;

namespace TripPlanner.Tests;

public class UpdateTripUseCaseTests
{
    private readonly ITripRepository _tripRepository = Substitute.For<ITripRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IApplicationMapper _mapper = Substitute.For<IApplicationMapper>();

    private UpdateTripUseCase UseCase() => new(_tripRepository, _unitOfWork, _mapper);

    private static UpdateTripRequest Request(string name, DateOnly start, DateOnly end, bool confirmed = false) =>
        new() { Name = name, StartDate = start, EndDate = end, Confirmed = confirmed };

    [Fact]
    public async Task ExecuteAsync_TripNotFound_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(99, 1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await UseCase().ExecuteAsync(99, Request("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3)), 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
    }

    [Fact]
    public async Task ExecuteAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 2, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await UseCase().ExecuteAsync(1, Request("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3)), 2);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
    }

    [Fact]
    public async Task ExecuteAsync_ShrinkDropsDaysWithDestinationsNotConfirmed_ReturnsConflictFailure()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3), 1);
        trip.Days.First(d => d.Day == new DateOnly(2024, 6, 3)).AddDestination(new Destination("Louvre", 4.9, "cultural", "9am-6pm"));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);

        var result = await UseCase().ExecuteAsync(1, Request("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2)), 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Conflict, result.Error!.ErrorType);
        Assert.Equal(3, trip.Days.Count);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_ShrinkDropsDaysWithDestinationsConfirmed_ReturnsSuccessWithRegeneratedDays()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3), 1);
        trip.Days.First(d => d.Day == new DateOnly(2024, 6, 3)).AddDestination(new Destination("Louvre", 4.9, "cultural", "9am-6pm"));
        var expected = new TripResponse { Name = "Trip" };
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _mapper.MapToTripResponse(trip).Returns(expected);

        var result = await UseCase().ExecuteAsync(1, Request("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), confirmed: true), 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        Assert.Equal(2, trip.Days.Count);
        Assert.DoesNotContain(trip.Days, d => d.Day == new DateOnly(2024, 6, 3));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_ShrinkDropsOnlyEmptyDays_SucceedsWithoutConfirmation()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3), 1);
        trip.Days.First(d => d.Day == new DateOnly(2024, 6, 1)).AddDestination(new Destination("Louvre", 4.9, "cultural", "9am-6pm"));
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _mapper.MapToTripResponse(trip).Returns(new TripResponse());

        var result = await UseCase().ExecuteAsync(1, Request("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2)), 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, trip.Days.Count);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_ExtendOnly_SucceedsAndAddsDays()
    {
        var trip = new Trip("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _mapper.MapToTripResponse(trip).Returns(new TripResponse());

        var result = await UseCase().ExecuteAsync(1, Request("Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 4)), 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(4, trip.Days.Count);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_NameOnlyChange_SucceedsAndKeepsDays()
    {
        var trip = new Trip("Old Name", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        var originalDays = trip.Days.ToList();
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _mapper.MapToTripResponse(trip).Returns(new TripResponse());

        var result = await UseCase().ExecuteAsync(1, Request("New Name", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2)), 1);

        Assert.True(result.IsSuccess);
        Assert.Equal("New Name", trip.Name);
        Assert.Equal(originalDays, trip.Days);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
