namespace TripPlanner.Domain.Models;

public class Destination
{
    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public double Rating { get; private set; }
    public string? ExternalId { get; private set; }
    public string Category { get; private set; } = string.Empty;
    public string? OpeningHours { get; private set; }

    private Destination() { }

    public Destination(string name, double rating, string category, string? openingHours = null, string? externalId = null)
    {
        Name = name;
        Rating = rating;
        Category = category;
        OpeningHours = openingHours;
        ExternalId = externalId;
    }
}
