import unittest

from app.data_access.database import initialize_database
from app.models.planting import PlantingRequest
from app.services.planting_engine import recommend_planting


class PlantingEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        initialize_database()

    def test_location_and_season_are_required(self) -> None:
        missing_location = recommend_planting(PlantingRequest())
        self.assertEqual(missing_location.status, "needs_clarification")
        self.assertEqual(missing_location.clarification.field, "location")

        missing_area = recommend_planting(PlantingRequest(county="Kiambu", season="Long rains"))
        self.assertEqual(missing_area.clarification.field, "location")

        missing_season = recommend_planting(PlantingRequest(county="Kiambu", area="Thika"))
        self.assertEqual(missing_season.status, "needs_clarification")
        self.assertEqual(missing_season.clarification.field, "season")

    def test_dry_context_prioritizes_lower_water_option(self) -> None:
        result = recommend_planting(
            PlantingRequest(
                county="Machakos", area="Kangundo", season="Short rains",
                irrigation="none", soil_drainage="good", risk_preference="low",
            )
        )
        self.assertEqual(result.status, "recommendations")
        self.assertEqual(result.recommendations[0].crop, "Sorghum")
        self.assertEqual(result.recommendations[0].suitability, "strong")
        self.assertLessEqual(len(result.recommendations), 2)
        self.assertTrue(any("Simulated seasonal rainfall" in text for text in result.recommendations[0].rationale))
        self.assertFalse(result.weather_context.live_forecast)
        self.assertTrue(result.evidence_gaps)

    def test_poor_drainage_downgrades_potato(self) -> None:
        result = recommend_planting(
            PlantingRequest(
                county="Kiambu", area="Thika", season="Long rains",
                crop_preference="Potato", irrigation="available", soil_drainage="poor",
            )
        )
        self.assertEqual(result.recommendations[0].suitability, "limited")
        self.assertTrue(any("poor drainage" in risk for risk in result.recommendations[0].risks_and_checks))

    def test_unmatched_local_calendar_is_not_replaced_by_national_advice(self) -> None:
        result = recommend_planting(
            PlantingRequest(county="Nakuru", area="Njoro", season="Short rains", crop_preference="Sorghum")
        )
        self.assertEqual(result.status, "needs_clarification")
        self.assertEqual(result.recommendations, [])

    def test_distant_coordinates_require_manual_location(self) -> None:
        result = recommend_planting(
            PlantingRequest(latitude=0, longitude=0, season="Long rains")
        )
        self.assertEqual(result.status, "needs_clarification")
        self.assertEqual(result.clarification.field, "manual_location")


if __name__ == "__main__":
    unittest.main()
