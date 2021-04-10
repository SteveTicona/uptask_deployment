const passport = require('passport');
const Usuarios = require('../models/Usuarios');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const crypto = require('crypto');
const bcrypt = require('bcrypt-nodejs');
const enviarEmail = require('../handlers/email');

exports.autenticarUsuario = passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/iniciar-sesion',
  failureFlash: true,
  badRequestMessage: 'Ambos Campos son Obligatorios',
});

// funcion para verificar si el usuario esta logueado
exports.usuarioAutenticado = (req, res, next) => {
  // si el usuario esta autenticado adelante
  if (req.isAuthenticated()) {
    return next();
  }
  // no esta autenticado redirigir al formulario
  return res.redirect('/iniciar-sesion');
};

// FUncion para cerrar sesion
exports.cerrarSesion = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/iniciar-sesion');
  });
};

// genera un token si el usuario es valido
exports.enviarToken = async (req, res) => {
  // Verificar que el usuarioe exista
  const { email } = req.body;
  const usuario = await Usuarios.findOne({ where: { email } });

  // Si no existe el usuario
  if (!usuario) {
    req.flash('error', 'No existe esa cuenta');
    res.redirect('/reestablecer');
  }
  // Usuario existe
  usuario.token = crypto.randomBytes(20).toString('hex');
  usuario.expiracion = Date.now() + 3600000;

  // Guardar en la base de datos
  await usuario.save();

  // url reset
  const resetUrl = `http://${req.headers.host}/reestablecer/${usuario.token}`;

  // enviar el correo con el token
  await enviarEmail.enviar({
    usuario,
    subject: 'Password Reset',
    resetUrl,
    archivo: 'reestablecer-password',
  });

  // terminar
  req.flash('correcto', 'Se envió un mensaje a tu correo');
  res.redirect('/iniciar-sesion');
};

exports.validarToken = async (req, res) => {
  const usuario = await Usuarios.findOne({
    where: {
      token: req.params.token,
    },
  });

  // Si no encuentra el usuario
  if (!usuario) {
    req.flash('error', 'No Válido');
    res.redirect('/reestablecer');
  }

  // formulario para generar password
  res.render('resetPassword', {
    nombrePagina: 'Reestablecer Contraseña',
  });
};

// Cambia el password por uno nuevo
exports.actualizarPassword = async (req, res) => {
  // Verific el token valido pero tambien la fecha de expiracion
  const usuario = await Usuarios.findOne({
    where: {
      token: req.params.token,
      expiracion: {
        [Op.gte]: Date.now(),
      },
    },
  });

  // verificamos si el usuario existe
  if (!usuario) {
    req.flash('Error', 'No Válido');
    res.redirect('/reestablecer');
  }

  // Hashear el nuevo password
  usuario.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
  usuario.token = null;
  usuario.expiracion = null;

  // guardamos en nuevo password
  await usuario.save();

  req.flash('correcto', 'Tu password se ha modificado correctamente');
  res.redirect('/iniciar-sesion');
};
