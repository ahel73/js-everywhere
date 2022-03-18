const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {
  AuthenticationError,
  ForbiddenError
} = require('apollo-server-express');
require('dotenv').config();
const gravatar = require('../util/gravatar');

module.exports = {
  newNote: async (parent, args, { models, user }) => {
    // Если в контексте нет пользователя, выбрасываем AuthenticationError
    if (!user) {
      throw new AuthenticationError(
        'Вы должны войти в систему, чтобы создать заметку'
      );
    }
    return await models.Note.create({
      content: args.content,
      author: mongoose.Types.ObjectId(user.id)
    });
  },

  deleteNote: async (parent, { id }, { models, user }) => {
    if (!user) {
      throw new AuthenticationError('Нет данных пользователя');
    }
    // Находим заметку и сверяем автора
    const note = await models.Note.findById(id);
    if (note && String(note.author) !== user.id) {
      throw new ForbiddenError('У вас недостаточно прав для удаления заметки');
    }
    // Если всё ок, удаляем заметку
    try {
      await note.remove();
      return true;
    } catch (err) {
      return false;
    }
  },

  updateNote: async (parent, { content, id }, { models, user }) => {
    if (!user) {
      throw new AuthenticationError('Нет данных пользователя');
    }
    // Находим заметку и сверяем автора
    const note = await models.Note.findById(id);
    if (note && String(note.author) !== user.id) {
      throw new ForbiddenError('У вас недостаточно прав для удаления заметки');
    }
    return await models.Note.findOneAndUpdate(
      {
        _id: id
      },
      {
        $set: {
          content
        }
      },
      {
        new: true
      }
    );
  },

  signUp: async (parent, { username, email, password }, { models }) => {
    // Нормализуем имейл
    email = email.trim().toLowerCase();
    // Хешируем пароль
    const hashed = await bcrypt.hash(password, 10);
    // Создаём url граватар изображения
    const avatar = gravatar(email);
    try {
      const user = await models.User.create({
        username,
        email,
        avatar,
        password: hashed
      });

      // Создаём и возвращаем json web token
      return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    } catch (err) {
      console.log(err);
      // Если при регистрации проблема выбрасываем ошибку
      throw new Error('ошибка регистрации пользователя');
    }
  },

  signIn: async (parent, { username, email, password }, { models }) => {
    if (email) {
      // Нормализуем имейл
      email = email.trim().toLowerCase();
    }

    const user = await models.User.findOne({
      $or: [
        {
          email
        },
        {
          username
        }
      ]
    });

    // Если пользователь не найден, выбрасываем ошибку аутентификации
    if (!user) {
      throw new AuthenticationError('Ошибка аутентификации');
    }

    // Если пароли не совпадают, выбрасываем ошибку аутентификации
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AuthenticationError('Пароли не совпадают');
    }

    // Создаём и возвращаем json web token
    return jwt.sign(
      {
        id: user._id
      },
      process.env.JWT_SECRET
    );
  },

  toggleFavorite: async (parent, { id }, { models, user }) => {
    if (!user) {
      throw new AuthenticationError('Нет данных пользователя');
    }

    // Проверяем, отмечал ли пользователь заметку как избранную
    let noteCheck = await models.Note.findById(id);
    const hasUser = noteCheck.favoritedBy.indexOf(user.id);

    // Если пользователь есть в списке, удаляем его оттуда и уменьшаем значение
    // favoriteCount на 1
    if (hasUser >= 0) {
      return await models.Note.findByIdAndUpdate(
        id,
        {
          $pull: {
            favoritedBy: mongoose.Types.ObjectId(user.id)
          },
          $inc: {
            favoriteCount: -1
          }
        },
        {
          // Устанавливаем new как true, чтобы вернуть обновленный документ
          new: true
        }
      );
    } else {
      // Если пользователя в списке нет, добавляем его туда и увеличиваем
      // значение favoriteCount на 1
      return await models.Note.findByIdAndUpdate(
        id,
        {
          $push: {
            favoritedBy: mongoose.Types.ObjectId(user.id)
          },
          $inc: {
            favoriteCount: 1
          }
        },
        {
          new: true
        }
      );
    }
  }
};
