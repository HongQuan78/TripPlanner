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

public class TripServiceTests
{
    private readonly ITripRepository _tripRepository = Substitute.For<ITripRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IApplicationMapper _mapper = Substitute.For<IApplicationMapper>();

    [Fact]
    public async Task GetTripAsync_ExistingId_ReturnsSuccessResult()
    {
        var trip = new Trip("Paris Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3), 1);
        var expected = new TripResponse { Id = 1, Name = "Paris Trip" };
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 1, Arg.Any<CancellationToken>()).Returns(trip);
        _mapper.MapToTripResponse(trip).Returns(expected);

        var result = await new GetTripUseCase(_tripRepository, _mapper).ExecuteAsync(1, 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
    }

    [Fact]
    public async Task GetTripAsync_NonExistingId_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(99, 1, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await new GetTripUseCase(_tripRepository, _mapper).ExecuteAsync(99, 1);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
    }

    [Fact]
    public async Task GetTripAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(1, 2, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await new GetTripUseCase(_tripRepository, _mapper).ExecuteAsync(1, 2);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
    }

    [Fact]
    public async Task GetAllTripsAsync_WithTrips_ReturnsSuccessResult()
    {
        var trips = new List<Trip> { new Trip("Trip A", new DateOnly(2024, 1, 1), new DateOnly(2024, 1, 2), 1) };
        var expected = new List<TripResponse> { new TripResponse { Name = "Trip A" } };
        _tripRepository.GetAllWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trips);
        _mapper.MapToTripResponseList(trips).Returns(expected);

        var result = await new GetAllTripsUseCase(_tripRepository, _mapper).ExecuteAsync(1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
    }

    [Fact]
    public async Task GetAllTripsAsync_QueriesRepositoryWithCallerUserId()
    {
        _tripRepository.GetAllWithDaysAndDestinationsAsync(7, Arg.Any<CancellationToken>()).Returns([]);
        _mapper.MapToTripResponseList(Arg.Any<List<Trip>>()).Returns([]);

        var result = await new GetAllTripsUseCase(_tripRepository, _mapper).ExecuteAsync(7);

        Assert.True(result.IsSuccess);
        await _tripRepository.Received(1).GetAllWithDaysAndDestinationsAsync(7, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateTripAsync_ValidRequest_ReturnsSuccessResult()
    {
        var request = new CreateTripRequest { Name = "Rome Trip", StartDate = new DateOnly(2024, 7, 1), EndDate = new DateOnly(2024, 7, 5) };
        var expected = new TripResponse { Name = "Rome Trip" };
        _mapper.MapToTripResponse(Arg.Any<Trip>()).Returns(expected);

        var result = await new CreateTripUseCase(_tripRepository, _unitOfWork, _mapper).ExecuteAsync(request, 1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        _tripRepository.Received(1).Add(Arg.Any<Trip>());
    }

    [Fact]
    public async Task CreateTripAsync_StampsCallerUserIdOnTrip()
    {
        var request = new CreateTripRequest { Name = "Rome Trip", StartDate = new DateOnly(2024, 7, 1), EndDate = new DateOnly(2024, 7, 5) };
        _mapper.MapToTripResponse(Arg.Any<Trip>()).Returns(new TripResponse());

        var result = await new CreateTripUseCase(_tripRepository, _unitOfWork, _mapper).ExecuteAsync(request, 7);

        Assert.True(result.IsSuccess);
        _tripRepository.Received(1).Add(Arg.Is<Trip>(t => t.UserId == 7));
    }

    [Fact]
    public async Task GetAllTripsAsync_EmptyRepository_ReturnsSuccessWithEmptyList()
    {
        var trips = new List<Trip>();
        var expected = new List<TripResponse>();
        _tripRepository.GetAllWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trips);
        _mapper.MapToTripResponseList(trips).Returns(expected);

        var result = await new GetAllTripsUseCase(_tripRepository, _mapper).ExecuteAsync(1);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Data!);
    }
}
