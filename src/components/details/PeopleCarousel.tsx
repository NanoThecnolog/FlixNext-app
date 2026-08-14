import React from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { appConfig } from "../../config/appConfig";
import { TmdbPerson } from "../../domain/content";
import { colors } from "../../theme";

export const PeopleCarousel = React.memo(function PeopleCarousel({
  title,
  people,
}: {
  title: string;
  people: TmdbPerson[];
}) {
  if (!people.length) return null;
  return (
    <View style={peopleStyles.container}>
      <View style={peopleStyles.heading}>
        <View style={peopleStyles.marker} />
        <Text style={peopleStyles.title}>{title}</Text>
      </View>
      <FlatList
        horizontal
        data={people}
        keyExtractor={(person) => `${title}:${person.id}:${person.job ?? person.character ?? ""}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={peopleStyles.list}
        renderItem={({ item }) => (
          <View style={peopleStyles.card}>
            <View style={peopleStyles.photoContainer}>
              {item.profile_path ? (
                <Image
                  source={{ uri: `${appConfig.imageUrl}/w185${item.profile_path}` }}
                  style={peopleStyles.photo}
                />
              ) : (
                <View style={peopleStyles.placeholder} />
              )}
            </View>
            <Text style={peopleStyles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={peopleStyles.role} numberOfLines={2}>
              {item.character || item.job || item.department || ""}
            </Text>
          </View>
        )}
      />
    </View>
  );
});

const peopleStyles = StyleSheet.create({
  container: { marginTop: 30 },
  heading: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 15 },
  marker: { width: 4, height: 22, borderRadius: 4, backgroundColor: colors.red },
  title: {
    color: colors.white,
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
  },
  list: { paddingRight: 18 },
  card: { width: 108, marginRight: 13 },
  photoContainer: {
    width: 108,
    height: 144,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  photo: { width: "100%", height: "100%" },
  placeholder: { flex: 1, backgroundColor: colors.surfaceLight },
  name: {
    color: colors.white,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  role: {
    color: "rgba(255,255,255,.48)",
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
});
