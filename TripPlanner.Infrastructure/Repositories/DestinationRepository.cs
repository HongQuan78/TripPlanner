using Microsoft.EntityFrameworkCore;
using TripPlanner.Application.Interfaces;
using TripPlanner.Application.Parameters;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Data;

namespace TripPlanner.Infrastructure.Repositories;

public class DestinationRepository(TripPlannerDbContext context) : Repository<Destination>(context), IDestinationRepository
{
    public async Task<List<Destination>> GetFilteredAsync(DestinationFilterParameter filter, CancellationToken cancellationToken = default) =>
        await ApplyFilters(Context.Destinations, filter).ToListAsync(cancellationToken);

    private static IQueryable<Destination> ApplyFilters(IQueryable<Destination> query, DestinationFilterParameter filter)
    {
        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            string category = filter.Category.Trim();
            query = query.Where(x => EF.Property<string>(x, "destination_type") == category);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            string search = filter.Search.Trim().ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(search));
        }

        return query;
    }
}
