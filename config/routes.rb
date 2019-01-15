Rails.application.routes.draw do
  root 'pages#landing_page'
  get 'auth/:provider/callback', to: 'sessions#create'
  get 'organizations', to: 'organizations#index'
end
