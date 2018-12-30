Rails.application.config.middleware.use OmniAuth::Builder do
  provider :developer unless Rails.env.production?
  provider :trello, ENV['TRELLO_KEY'], ENV['TRELLO_SECRET'], app_name: 'Trello Activity', scope: 'read,account', expiration: 'never'
end
