import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';

const HomeScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('http://localhost:5000/api/bookings', config);
      setBookings(response.data.data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to BookMalawi</Text>
      
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Search')}>
        <Text style={styles.buttonText}>Search Accommodations</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Bookings</Text>
      
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingNumber}>{item.booking_number}</Text>
            <Text style={styles.bookingDate}>{item.check_in_date} - {item.check_out_date}</Text>
            <Text style={styles.bookingStatus}>{item.status}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  bookingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookingDate: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  bookingStatus: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default HomeScreen;
