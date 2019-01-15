require 'test_helper'

class OrganizationsControllerTest < ActionDispatch::IntegrationTest
  test 'should show index page' do
    get '/organizations'
    assert_response :success
  end
end
