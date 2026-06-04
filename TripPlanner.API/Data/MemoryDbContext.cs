using TripPlanner.API.Models;

namespace TripPlanner.API.Data;

public class MemoryDbContext
{
    public List<Trip> Trips {get;} = [];
    public List<Destination> Destinations {get;} =
    [
        new Landmark(1, "Landmark 81", 4.5, "08:00 - 22:00"),
        new Landmark(2, "Hoi An Acient Town", 4.8, "Open all day"),
        new Landmark(3, "Vinpearl Safari Phu Quoc", 4.6, "09:00 - 16:00"),
        new Restaurant(4, "Com que duong bau", 4.4, "Vietnamese", false),
        new Restaurant(5, "Pho Hoa Pasteur", 4.5, "Vietnamese", false),
        new Restaurant(6, "Com tam 3 anh em", 4.4, "Vietnamese", false)
    ];

}