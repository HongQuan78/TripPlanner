using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class RestaurantConfiguration : IEntityTypeConfiguration<Restaurant>
{
    public void Configure(EntityTypeBuilder<Restaurant> builder)
    {
        builder.HasData(
            new { Id = 4, Name = "Com que duong bau", Rating = 4.4, destination_type = "Restaurant" },
            new { Id = 5, Name = "Pho Hoa Pasteur", Rating = 4.5, destination_type = "Restaurant" },
            new { Id = 6, Name = "Com tam 3 anh em", Rating = 4.4, destination_type = "Restaurant" }
        );
    }
}
