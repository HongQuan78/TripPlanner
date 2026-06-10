using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class LandmarkConfiguration : IEntityTypeConfiguration<Landmark>
{
    public void Configure(EntityTypeBuilder<Landmark> builder)
    {
        builder.Property(l => l.OpeningHours).IsRequired().HasMaxLength(100);

        builder.HasData(
            new { Id = 1, Name = "Landmark 81", Rating = 4.5, OpeningHours = "08:00 - 22:00", destination_type = "Landmark" },
            new { Id = 2, Name = "Hoi An Ancient Town", Rating = 4.8, OpeningHours = "Open all day", destination_type = "Landmark" },
            new { Id = 3, Name = "Vinpearl Safari Phu Quoc", Rating = 4.6, OpeningHours = "09:00 - 16:00", destination_type = "Landmark" }
        );
    }
}
