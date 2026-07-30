using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class TripDayConfiguration : IEntityTypeConfiguration<TripDay>
{
    public void Configure(EntityTypeBuilder<TripDay> builder)
    {
        builder.ToTable("trip_days");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).UseIdentityAlwaysColumn();
        builder.Property(d => d.TripId).IsRequired();
        builder.Property(d => d.Day).IsRequired();

        builder.HasIndex(d => new { d.TripId, d.Day }).IsUnique();

        builder.HasMany<TripDayDestination>("_items")
            .WithOne()
            .HasForeignKey(item => item.TripDayId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Metadata.FindNavigation("_items")!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(d => d.Destinations);
    }
}
