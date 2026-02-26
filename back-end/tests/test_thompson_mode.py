import os
from unittest import mock
import app.api.email_hub

def test_thompson_mode_toggle():
    with mock.patch("app.api.email_hub.get_database") as mock_db, \
         mock.patch("app.api.email_hub.thompson_select") as mock_ts:
        
        # mock DB collections
        mock_col = mock.MagicMock()
        mock_col.find.return_value = [{"name": "A"}, {"name": "B"}]
        # mock best and promoted to bypass exceptions down the line
        mock_col.find_one.return_value = None 
        mock_db.return_value = {"template_performance": mock_col}
        
        # Test 1: Production Mode (default)
        os.environ["EXPERIMENT_MODE"] = "production"
        app.api.email_hub.select_template_variant("org1", "camp1")
        mock_ts.assert_not_called()
        
        # Test 2: Research Mode
        os.environ["EXPERIMENT_MODE"] = "research"
        mock_ts.return_value = "A"
        res = app.api.email_hub.select_template_variant("org1", "camp1")
        assert mock_ts.called
        assert res == "A"
        
        # Cleanup
        del os.environ["EXPERIMENT_MODE"]
