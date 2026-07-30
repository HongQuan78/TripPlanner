using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTripOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM trips;");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "trips",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_trips_UserId",
                table: "trips",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_trips_users_UserId",
                table: "trips",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_trips_users_UserId",
                table: "trips");

            migrationBuilder.DropIndex(
                name: "IX_trips_UserId",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "trips");
        }
    }
}
