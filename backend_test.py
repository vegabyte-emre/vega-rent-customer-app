#!/usr/bin/env python3
"""
FleetEase Backend API Test Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
from datetime import datetime, timedelta
import uuid
import sys

# Backend URL from frontend .env
BACKEND_URL = "https://carsforhire.preview.emergentagent.com/api"

class FleetEaseAPITester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_results = []
        self.reservation_id = None
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with proper error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        # Add auth header if we have a session token
        if self.session_token and headers is None:
            headers = {"Authorization": f"Bearer {self.session_token}"}
        elif self.session_token and headers:
            headers["Authorization"] = f"Bearer {self.session_token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_seed_data(self):
        """Test seed data endpoint"""
        print("\n=== Testing Seed Data ===")
        
        response = self.make_request("POST", "/seed")
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Seed Data", True, f"Created {data.get('vehicles', 0)} vehicles, {data.get('locations', 0)} locations, {data.get('campaigns', 0)} campaigns")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Seed Data", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_auth_register(self):
        """Test user registration"""
        print("\n=== Testing Auth - Register ===")
        
        # Generate unique email for testing
        unique_id = uuid.uuid4().hex[:8]
        register_data = {
            "name": "Ahmet Yılmaz",
            "email": f"ahmet.yilmaz.{unique_id}@example.com",
            "phone": f"555987{unique_id[:4]}",
            "password": "Test1234"
        }
        
        response = self.make_request("POST", "/auth/register", register_data)
        if response and response.status_code == 200:
            data = response.json()
            self.session_token = data.get("session_token")
            self.user_id = data.get("user", {}).get("user_id")
            self.log_test("User Registration", True, f"User created with ID: {self.user_id}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("User Registration", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_auth_login(self):
        """Test user login with existing credentials"""
        print("\n=== Testing Auth - Login ===")
        
        # Generate unique email for login test
        unique_id = uuid.uuid4().hex[:8]
        login_email = f"login.test.{unique_id}@example.com"
        
        # Try to login with a test user (we'll create one first)
        login_data = {
            "email": login_email,
            "password": "Test1234"
        }
        
        # First register the test user
        register_data = {
            "name": "Login Test User",
            "email": login_email,
            "phone": f"555123{unique_id[:4]}",
            "password": "Test1234"
        }
        
        # Register first
        reg_response = self.make_request("POST", "/auth/register", register_data)
        if not reg_response or reg_response.status_code != 200:
            self.log_test("User Login", False, "Failed to register test user for login test")
            return
        
        # Now try login
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            # Update session token for subsequent tests
            self.session_token = data.get("session_token")
            self.user_id = data.get("user", {}).get("user_id")
            self.log_test("User Login", True, f"Login successful for user: {self.user_id}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("User Login", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_auth_me(self):
        """Test get current user endpoint"""
        print("\n=== Testing Auth - Get Me ===")
        
        if not self.session_token:
            self.log_test("Get Current User", False, "No session token available")
            return
            
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Get Current User", True, f"Retrieved user: {data.get('name', 'Unknown')}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Current User", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_vehicles_list(self):
        """Test vehicles listing with filters"""
        print("\n=== Testing Vehicles - List ===")
        
        # Test basic listing
        response = self.make_request("GET", "/vehicles")
        if response and response.status_code == 200:
            vehicles = response.json()
            self.log_test("Vehicles List", True, f"Retrieved {len(vehicles)} vehicles")
            
            # Test with filters
            filter_tests = [
                ("?segment=Ekonomi", "segment filter"),
                ("?brand=Toyota", "brand filter"),
                ("?transmission=Otomatik", "transmission filter"),
                ("?fuel_type=Benzin", "fuel type filter"),
                ("?min_price=500&max_price=1000", "price range filter")
            ]
            
            for filter_param, filter_name in filter_tests:
                filter_response = self.make_request("GET", f"/vehicles{filter_param}")
                if filter_response and filter_response.status_code == 200:
                    filtered_vehicles = filter_response.json()
                    self.log_test(f"Vehicles {filter_name}", True, f"Retrieved {len(filtered_vehicles)} vehicles")
                else:
                    error_msg = filter_response.text if filter_response else "No response"
                    self.log_test(f"Vehicles {filter_name}", False, f"Status: {filter_response.status_code if filter_response else 'None'}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Vehicles List", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_vehicle_detail(self):
        """Test vehicle detail endpoint"""
        print("\n=== Testing Vehicles - Detail ===")
        
        # Test with known vehicle ID from seed data
        response = self.make_request("GET", "/vehicles/v001")
        if response and response.status_code == 200:
            vehicle = response.json()
            self.log_test("Vehicle Detail", True, f"Retrieved vehicle: {vehicle.get('brand', 'Unknown')} {vehicle.get('model', 'Unknown')}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Vehicle Detail", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_reservations_create(self):
        """Test reservation creation"""
        print("\n=== Testing Reservations - Create ===")
        
        if not self.session_token:
            self.log_test("Create Reservation", False, "No session token available")
            return
            
        # Create reservation data
        pickup_date = datetime.now() + timedelta(days=1)
        return_date = pickup_date + timedelta(days=3)
        
        reservation_data = {
            "vehicle_id": "v001",
            "pickup_date": pickup_date.isoformat() + "Z",
            "return_date": return_date.isoformat() + "Z",
            "pickup_location": "İstanbul Havalimanı",
            "return_location": "İstanbul Havalimanı",
            "extras": ["tam_kasko"],
            "driver_info": {
                "tc_kimlik": "12345678901",
                "ehliyet_no": "ABC123",
                "ehliyet_sinifi": "B",
                "ehliyet_tarihi": "2020-01-01"
            }
        }
        
        response = self.make_request("POST", "/reservations", reservation_data)
        if response and response.status_code == 200:
            reservation = response.json()
            self.reservation_id = reservation.get("reservation_id")
            self.log_test("Create Reservation", True, f"Created reservation: {self.reservation_id}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Create Reservation", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_reservations_list(self):
        """Test reservations listing"""
        print("\n=== Testing Reservations - List ===")
        
        if not self.session_token:
            self.log_test("List Reservations", False, "No session token available")
            return
            
        response = self.make_request("GET", "/reservations")
        if response and response.status_code == 200:
            reservations = response.json()
            self.log_test("List Reservations", True, f"Retrieved {len(reservations)} reservations")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("List Reservations", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_reservation_detail(self):
        """Test reservation detail"""
        print("\n=== Testing Reservations - Detail ===")
        
        if not self.session_token or not self.reservation_id:
            self.log_test("Reservation Detail", False, "No session token or reservation ID available")
            return
            
        response = self.make_request("GET", f"/reservations/{self.reservation_id}")
        if response and response.status_code == 200:
            reservation = response.json()
            self.log_test("Reservation Detail", True, f"Retrieved reservation: {reservation.get('reservation_id')}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Reservation Detail", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_reservation_payment(self):
        """Test reservation payment (mock)"""
        print("\n=== Testing Reservations - Payment ===")
        
        if not self.session_token or not self.reservation_id:
            self.log_test("Reservation Payment", False, "No session token or reservation ID available")
            return
            
        response = self.make_request("POST", f"/reservations/{self.reservation_id}/pay")
        if response and response.status_code == 200:
            result = response.json()
            self.log_test("Reservation Payment", True, f"Payment successful: {result.get('message')}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Reservation Payment", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_reservation_cancel(self):
        """Test reservation cancellation"""
        print("\n=== Testing Reservations - Cancel ===")
        
        if not self.session_token:
            self.log_test("Cancel Reservation", False, "No session token available")
            return
            
        # Create a new reservation to cancel
        pickup_date = datetime.now() + timedelta(days=5)
        return_date = pickup_date + timedelta(days=2)
        
        reservation_data = {
            "vehicle_id": "v002",
            "pickup_date": pickup_date.isoformat() + "Z",
            "return_date": return_date.isoformat() + "Z",
            "pickup_location": "Ankara Esenboğa Havalimanı",
            "return_location": "Ankara Esenboğa Havalimanı",
            "extras": [],
            "driver_info": {
                "tc_kimlik": "98765432109",
                "ehliyet_no": "XYZ789",
                "ehliyet_sinifi": "B",
                "ehliyet_tarihi": "2019-05-15"
            }
        }
        
        # Create reservation
        create_response = self.make_request("POST", "/reservations", reservation_data)
        if not create_response or create_response.status_code != 200:
            self.log_test("Cancel Reservation", False, "Failed to create reservation for cancellation test")
            return
            
        cancel_reservation_id = create_response.json().get("reservation_id")
        
        # Now cancel it
        response = self.make_request("DELETE", f"/reservations/{cancel_reservation_id}")
        if response and response.status_code == 200:
            result = response.json()
            self.log_test("Cancel Reservation", True, f"Cancellation successful: {result.get('message')}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Cancel Reservation", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_notifications(self):
        """Test notifications endpoints"""
        print("\n=== Testing Notifications ===")
        
        if not self.session_token:
            self.log_test("Notifications", False, "No session token available")
            return
            
        # Test list notifications
        response = self.make_request("GET", "/notifications")
        if response and response.status_code == 200:
            notifications = response.json()
            self.log_test("List Notifications", True, f"Retrieved {len(notifications)} notifications")
            
            # Test unread count
            count_response = self.make_request("GET", "/notifications/unread-count")
            if count_response and count_response.status_code == 200:
                count_data = count_response.json()
                self.log_test("Unread Count", True, f"Unread count: {count_data.get('count', 0)}")
                
                # Test mark all as read
                mark_response = self.make_request("PUT", "/notifications/read-all")
                if mark_response and mark_response.status_code == 200:
                    self.log_test("Mark All Read", True, "All notifications marked as read")
                else:
                    error_msg = mark_response.text if mark_response else "No response"
                    self.log_test("Mark All Read", False, f"Status: {mark_response.status_code if mark_response else 'None'}")
            else:
                error_msg = count_response.text if count_response else "No response"
                self.log_test("Unread Count", False, f"Status: {count_response.status_code if count_response else 'None'}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("List Notifications", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_locations(self):
        """Test locations endpoint"""
        print("\n=== Testing Locations ===")
        
        response = self.make_request("GET", "/locations")
        if response and response.status_code == 200:
            locations = response.json()
            self.log_test("Locations", True, f"Retrieved {len(locations)} locations")
            
            # Test with city filter
            city_response = self.make_request("GET", "/locations?city=İstanbul")
            if city_response and city_response.status_code == 200:
                city_locations = city_response.json()
                self.log_test("Locations City Filter", True, f"Retrieved {len(city_locations)} locations for İstanbul")
            else:
                error_msg = city_response.text if city_response else "No response"
                self.log_test("Locations City Filter", False, f"Status: {city_response.status_code if city_response else 'None'}")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Locations", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_campaigns(self):
        """Test campaigns endpoint"""
        print("\n=== Testing Campaigns ===")
        
        response = self.make_request("GET", "/campaigns")
        if response and response.status_code == 200:
            campaigns = response.json()
            self.log_test("Campaigns", True, f"Retrieved {len(campaigns)} campaigns")
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Campaigns", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def test_auth_logout(self):
        """Test logout endpoint"""
        print("\n=== Testing Auth - Logout ===")
        
        if not self.session_token:
            self.log_test("Logout", False, "No session token available")
            return
            
        response = self.make_request("POST", "/auth/logout")
        if response and response.status_code == 200:
            self.log_test("Logout", True, "Logout successful")
            self.session_token = None
            self.user_id = None
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Logout", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting FleetEase Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test sequence following the review request flow
        self.test_seed_data()
        self.test_auth_register()
        self.test_auth_login()
        self.test_auth_me()
        self.test_vehicles_list()
        self.test_vehicle_detail()
        self.test_reservations_create()
        self.test_reservations_list()
        self.test_reservation_detail()
        self.test_reservation_payment()
        self.test_notifications()
        self.test_locations()
        self.test_campaigns()
        self.test_auth_logout()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = FleetEaseAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)