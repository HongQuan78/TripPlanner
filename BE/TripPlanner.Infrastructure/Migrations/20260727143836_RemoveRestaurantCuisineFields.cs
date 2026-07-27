using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRestaurantCuisineFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CuisineType",
                table: "destinations");

            migrationBuilder.DropColumn(
                name: "IsHalalFriendly",
                table: "destinations");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CuisineType",
                table: "destinations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHalalFriendly",
                table: "destinations",
                type: "boolean",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "CuisineType", "IsHalalFriendly" },
                values: new object[] { "Vietnamese", false });

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "CuisineType", "IsHalalFriendly" },
                values: new object[] { "Vietnamese", false });

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "CuisineType", "IsHalalFriendly" },
                values: new object[] { "Vietnamese", false });
        }
    }
}
