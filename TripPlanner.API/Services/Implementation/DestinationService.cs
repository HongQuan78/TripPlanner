using AutoMapper;
using TripPlanner.API.Common;
using TripPlanner.API.Data;
using TripPlanner.API.DTOs.Responses;
using TripPlanner.API.Models;
using TripPlanner.API.Parameters;
using TripPlanner.API.Services.Interface;

namespace TripPlanner.API.Services.Implementation;

public class DestinationService(MemoryDbContext dbContext, IMapper mapper) : IDestinationService
{
    public Result<List<DestinationResponse>> GetAllDestinations(DestinationFilterParameter filter)
    {
        IEnumerable<Destination> destinations = dbContext.Destinations;

        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            destinations = destinations.Where(x => string.Equals(x.Category, filter.Category.Trim(), StringComparison.OrdinalIgnoreCase));
        }
        
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            destinations = destinations.Where(x => x.Name.Contains(filter.Search.Trim(), StringComparison.OrdinalIgnoreCase));
        }
        return Result<List<DestinationResponse>>.Success(mapper.Map<List<DestinationResponse>>(destinations));
    }

    public Result<DestinationResponse> GetDestinationById(int id) 
    {
        Destination? destination = dbContext.Destinations.FirstOrDefault(x => x.Id == id);
        if (destination is null)
        {
            return Result<DestinationResponse>.Failure(ErrorType.NotFound, "Destination Id does not exist.");
        }
        return Result<DestinationResponse>.Success(mapper.Map<DestinationResponse>(destination));
    }
}