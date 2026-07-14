using AutoMapper;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Mappings;

namespace TripPlanner.Tests;

public class MappingProfileTests
{
    private static readonly IMapper Mapper = new MapperConfiguration(
            cfg => cfg.AddProfile<MappingProfile>(), NullLoggerFactory.Instance)
        .CreateMapper();

    [Fact]
    public void Map_DestinationWithExternalId_PopulatesXid()
    {
        var landmark = new Landmark("Eiffel Tower", 4.8, "9am-11pm", "xid123");

        var response = Mapper.Map<DestinationResponse>(landmark);

        Assert.Equal("xid123", response.Xid);
    }

    [Fact]
    public void Map_DestinationWithoutExternalId_XidIsNull()
    {
        var landmark = new Landmark("Eiffel Tower", 4.8, "9am-11pm");

        var response = Mapper.Map<DestinationResponse>(landmark);

        Assert.Null(response.Xid);
    }
}
