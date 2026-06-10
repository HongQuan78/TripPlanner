using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class TripConfiguration : IEntityTypeConfiguration<Trip>
{
    public void Configure(EntityTypeBuilder<Trip> builder)
    {
        builder.ToTable("trips");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).UseIdentityAlwaysColumn();
        builder.Property(t => t.Name).IsRequired().HasMaxLength(200);
        builder.Property(t => t.StartDate).IsRequired();
        builder.Property(t => t.EndDate).IsRequired();

        builder.HasMany(t => t.Days)
            .WithOne()
            .HasForeignKey(d => d.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(t => t.Days)
            .HasField("_days")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
