namespace TripPlanner.Domain.Models;

public class Restaurant(int id, string name, double rating, string cuisineType, bool isHalalFriendly) : Destination(id, name, rating)
{
    public string CuisineType { get; set; } = cuisineType;
    public bool IsHalalFriendly { get; set; } = isHalalFriendly;
    public override string Category => "Restaurant";
}