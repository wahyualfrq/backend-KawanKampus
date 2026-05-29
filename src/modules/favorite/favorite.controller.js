const prisma = require('../../common/config/prisma');

function mapCategoryToPrisma(cat) {
  const s = String(cat || '').toLowerCase();
  if (s.includes('fotokopi') || s.includes('photocopy') || s.includes('fotocopy')) return 'PHOTOCOPY';
  if (s.includes('makanan') || s.includes('cafe') || s.includes('kopi') || s.includes('restoran') || s.includes('food') || s.includes('minuman') || s.includes('kedai') || s.includes('warteg') || s.includes('pizza') || s.includes('es krim')) return 'FOOD';
  if (s.includes('atk') || s.includes('print') || s.includes('tulis') || s.includes('buku')) return 'ATK';
  return 'ATK';
}

function mapPrismaCategoryToFrontend(cat) {
  if (cat === 'PHOTOCOPY') return 'Fotokopi';
  if (cat === 'FOOD') return 'Makanan';
  if (cat === 'ATK') return 'ATK';
  return cat;
}

class FavoriteController {
  async getFavorites(req, res, next) {
    try {
      const userId = req.user.userId;
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        include: { place: true }
      });

      const formatted = favorites.map(fav => ({
        id: fav.id,
        placeId: fav.place.id,
        googleId: fav.place.googleId,
        name: fav.place.name,
        category: mapPrismaCategoryToFrontend(fav.place.category),
        address: fav.place.address,
        lat: fav.place.lat,
        lon: fav.place.lng,
        mapLink: fav.place.googleId,
        createdAt: fav.createdAt
      }));

      res.status(200).json({
        success: true,
        data: formatted,
        message: 'Favorites retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async addFavorite(req, res, next) {
    try {
      const { name, category, address, lat, lng, lon, mapLink } = req.body;
      const userId = req.user.userId;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Name is required' });
      }

      // Generate a stable googleId
      const googleId = mapLink || `${name}_${category || 'ATK'}_${lat || 0}_${lng || lon || 0}`;

      // Find or create place
      let place = await prisma.place.findUnique({ where: { googleId } });
      if (!place) {
        let parsedLat = parseFloat(lat);
        let parsedLng = parseFloat(lng || lon);
        if ((isNaN(parsedLat) || isNaN(parsedLng)) && mapLink) {
          const coordsMatch = mapLink.match(/(?:query|q|search\/|@)(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i) ||
                              mapLink.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
          if (coordsMatch) {
            parsedLat = parseFloat(coordsMatch[1]);
            parsedLng = parseFloat(coordsMatch[2]);
          }
        }
        if (isNaN(parsedLat)) parsedLat = 0.0;
        if (isNaN(parsedLng)) parsedLng = 0.0;

        place = await prisma.place.create({
          data: {
            googleId,
            name,
            category: mapCategoryToPrisma(category),
            address: address || '',
            lat: parsedLat,
            lng: parsedLng,
          }
        });
      }

      // Create favorite
      const favorite = await prisma.favorite.upsert({
        where: {
          userId_placeId: {
            userId,
            placeId: place.id
          }
        },
        create: {
          userId,
          placeId: place.id
        },
        update: {}
      });

      // Save History Activity
      await prisma.history.create({
        data: {
          userId,
          action: 'SAVED_FAVORITE',
          metadata: {
            placeId: place.id,
            name: place.name,
            category: mapPrismaCategoryToFrontend(place.category),
            address: place.address,
            mapLink: place.googleId
          }
        }
      });

      res.status(201).json({
        success: true,
        data: {
          id: favorite.id,
          placeId: place.id,
          googleId: place.googleId,
          name: place.name,
          category: mapPrismaCategoryToFrontend(place.category),
          address: place.address,
          lat: place.lat,
          lon: place.lng,
          mapLink: place.googleId
        },
        message: 'Place added to favorites'
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFavorite(req, res, next) {
    try {
      const { placeId } = req.params;
      const userId = req.user.userId;

      // Find the favorite mapping
      const fav = await prisma.favorite.findFirst({
        where: {
          userId,
          OR: [
            { id: placeId },
            { placeId: placeId },
            { place: { googleId: placeId } }
          ]
        }
      });

      if (!fav) {
        return res.status(404).json({ success: false, message: 'Favorite not found' });
      }

      await prisma.favorite.delete({
        where: { id: fav.id }
      });

      res.status(200).json({
        success: true,
        message: 'Place removed from favorites'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FavoriteController();
