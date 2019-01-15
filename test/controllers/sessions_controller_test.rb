require 'test_helper'

class SessionsControllerTest < ActionDispatch::IntegrationTest
  test 'can access create' do
    get '/auth/trello/callback'
    assert_response :redirect
    assert_redirected_to organizations_url
  end
end
