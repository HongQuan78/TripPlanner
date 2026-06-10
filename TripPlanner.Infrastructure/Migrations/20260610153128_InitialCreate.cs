using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TripPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "destinations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Rating = table.Column<double>(type: "double precision", nullable: false),
                    destination_type = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: false),
                    OpeningHours = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CuisineType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsHalalFriendly = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_destinations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "trips",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trips", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "trip_days",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    TripId = table.Column<int>(type: "integer", nullable: false),
                    Day = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trip_days", x => x.Id);
                    table.ForeignKey(
                        name: "FK_trip_days_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "trip_day_destinations",
                columns: table => new
                {
                    trip_day_id = table.Column<int>(type: "integer", nullable: false),
                    destination_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trip_day_destinations", x => new { x.trip_day_id, x.destination_id });
                    table.ForeignKey(
                        name: "FK_trip_day_destinations_destinations_destination_id",
                        column: x => x.destination_id,
                        principalTable: "destinations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trip_day_destinations_trip_days_trip_day_id",
                        column: x => x.trip_day_id,
                        principalTable: "trip_days",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "destinations",
                columns: new[] { "Id", "Name", "OpeningHours", "Rating", "destination_type" },
                values: new object[,]
                {
                    { 1, "Landmark 81", "08:00 - 22:00", 4.5, "Landmark" },
                    { 2, "Hoi An Ancient Town", "Open all day", 4.7999999999999998, "Landmark" },
                    { 3, "Vinpearl Safari Phu Quoc", "09:00 - 16:00", 4.5999999999999996, "Landmark" }
                });

            migrationBuilder.InsertData(
                table: "destinations",
                columns: new[] { "Id", "CuisineType", "IsHalalFriendly", "Name", "Rating", "destination_type" },
                values: new object[,]
                {
                    { 4, "Vietnamese", false, "Com que duong bau", 4.4000000000000004, "Restaurant" },
                    { 5, "Vietnamese", false, "Pho Hoa Pasteur", 4.5, "Restaurant" },
                    { 6, "Vietnamese", false, "Com tam 3 anh em", 4.4000000000000004, "Restaurant" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_trip_day_destinations_destination_id",
                table: "trip_day_destinations",
                column: "destination_id");

            migrationBuilder.CreateIndex(
                name: "IX_trip_days_TripId_Day",
                table: "trip_days",
                columns: new[] { "TripId", "Day" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trip_day_destinations");

            migrationBuilder.DropTable(
                name: "destinations");

            migrationBuilder.DropTable(
                name: "trip_days");

            migrationBuilder.DropTable(
                name: "trips");
        }
    }
}
