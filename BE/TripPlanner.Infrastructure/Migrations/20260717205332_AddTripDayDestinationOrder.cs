using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTripDayDestinationOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "position",
                table: "trip_day_destinations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(
                "UPDATE trip_day_destinations t SET position = s.rn - 1 " +
                "FROM (SELECT trip_day_id, destination_id, ROW_NUMBER() OVER (PARTITION BY trip_day_id ORDER BY destination_id) AS rn FROM trip_day_destinations) s " +
                "WHERE t.trip_day_id = s.trip_day_id AND t.destination_id = s.destination_id;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "position",
                table: "trip_day_destinations");
        }
    }
}
