import unittest
from unittest.mock import patch

from app.data_access import disease_repository, planting_repository


class OptionalQueryFiltersTests(unittest.TestCase):
    def test_optional_crop_filters_do_not_bind_null_for_a_type_check(self):
        with patch.object(disease_repository, "_rows", return_value=[]) as rows:
            disease_repository.search_disease_candidates(None, "", None)
            query, parameters = rows.call_args.args
            self.assertNotIn("IS NULL", query)
            self.assertEqual(parameters, ())

        with patch.object(disease_repository, "_rows", return_value=[]) as rows:
            disease_repository.get_treatments("Kiambu", None, [1])
            query, parameters = rows.call_args.args
            self.assertNotIn("IS NULL", query)
            self.assertEqual(parameters, (1,))

        with patch.object(planting_repository, "_rows", return_value=[]) as rows:
            planting_repository.find_calendars("Kiambu", "Long rains", None)
            query, parameters = rows.call_args.args
            self.assertNotIn("IS NULL", query)
            self.assertEqual(parameters, ("Kiambu", "Long rains"))
