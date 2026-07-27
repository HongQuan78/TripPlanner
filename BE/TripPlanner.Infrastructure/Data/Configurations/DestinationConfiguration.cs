using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class DestinationConfiguration : IEntityTypeConfiguration<Destination>
{
    public void Configure(EntityTypeBuilder<Destination> builder)
    {
        builder.ToTable("destinations");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).UseIdentityAlwaysColumn();
        builder.Property(d => d.Name).IsRequired().HasMaxLength(200);
        builder.Property(d => d.Rating).IsRequired();
        builder.Property(d => d.Category).IsRequired().HasMaxLength(100);
        builder.Property(d => d.OpeningHours).HasMaxLength(100);
        builder.Property(d => d.ExternalId).HasMaxLength(100);
        builder.HasIndex(d => d.ExternalId).IsUnique();

        builder.HasData(
            new { Id = 1, Name = "Landmark 81", Rating = 4.5, Category = "architecture", OpeningHours = "08:00 - 22:00", ExternalId = (string?)null },
            new { Id = 2, Name = "Hoi An Ancient Town", Rating = 4.8, Category = "historic", OpeningHours = "Open all day", ExternalId = (string?)null },
            new { Id = 3, Name = "Vinpearl Safari Phu Quoc", Rating = 4.6, Category = "amusements", OpeningHours = "09:00 - 16:00", ExternalId = (string?)null },
            new { Id = 4, Name = "Com que duong bau", Rating = 4.4, Category = "foods", OpeningHours = (string?)null, ExternalId = (string?)null },
            new { Id = 5, Name = "Pho Hoa Pasteur", Rating = 4.5, Category = "foods", OpeningHours = (string?)null, ExternalId = (string?)null },
            new { Id = 6, Name = "Com tam 3 anh em", Rating = 4.4, Category = "foods", OpeningHours = (string?)null, ExternalId = (string?)null }
        );
    }
}
