class Api < Sinatra::Base
  
  def oauth_token
    session[:oauth_token] ||= params['oauth_token']
  end

  def oauth_token_secret
    session[:oauth_secret] ||= params['oauth_token_secret']
  end

  def http 
    Http.new({
      'Authorization': ->(req) {
        request = Net::HTTP::Get.new(Addressable::URI.parse(req.uri).to_s)

        consumer = OAuth::Consumer.new(
          ENV['TRELLO_KEY'],
          ENV['TRELLO_SECRET']
        )
        consumer.options[:signature_method] = 'HMAC-SHA1'
        consumer.options[:nonce] = SecureRandom.hex()
        consumer.options[:timestamp] = Time.now.to_i
        consumer.options[:uri] = req.uri
        consumer.key = ENV['TRELLO_KEY'] 
        consumer.secret = ENV['TRELLO_SECRET'] 
        consumer.
          sign!(request,
                OAuth::Token.
                  new(oauth_token, oauth_token_secret))

        request['authorization']
      }
    },{
      key: params[:key],
      token: params[:token]
    })
  end

  get '/organizations' do
    JSON.dump(Trello::Member.new(http, 'id' => 'me').organizations.map(&:data))
  end

  get '/organizations/:id/boards' do
    JSON.dump(Trello::Organization.new(http, 'id' => params[:id])
      .boards.map(&:data))
  end

  get '/organization/:id/members' do
    JSON.dump(Trello::Organization.new(http, 'id' => params[:id])
      .members({ idModels: params[:idModels] }).map(&:data))
  end

  get '/members/:id/actions' do
    JSON.dump(Trello::Member.new(http, 'id' => params[:id])
      .actions({
        idModels: params[:idModels],
        filters: params[:filters],
        limit: params[:limit]
      }).map(&:data))
  end
end
