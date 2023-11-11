const getAuthHeader = () => {
    const token = localStorage.getItem("jwt");
    const authHeader = {
        headers: {
            Authorization: "Bearer " + token
        }
    };
    return authHeader;
}

const isUserAuth = () => {    
    return (localStorage.getItem("jwt"));
}

export { getAuthHeader, isUserAuth };